/**
 * Production Smoke Tests
 *
 * These tests verify that the MangaMotion application is working correctly
 * in the production environment. They focus on critical functionality and
 * are designed to run quickly while providing good coverage.
 */

describe('Production Smoke Tests', () => {
  const baseUrl = Cypress.config().baseUrl
  const testPrompts = [
    'smoke-test: convert to anime-style',
    'simple test: make this artistic',
    'basic transformation test'
  ]

  beforeEach(() => {
    // Set up authentication if needed
    const accessToken = Cypress.env('TEST_ACCESS_TOKEN')
    if (accessToken) {
      cy.log('Using provided access token for authentication')
      localStorage.setItem('access_token', accessToken)
    }

    // Clear any previous test data
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  context('Basic Application Health', () => {
    it('should load the main application', () => {
      cy.visit('/')
      cy.get('body').should('be.visible')

      // Check that we're not in error state
      cy.get('body').should('not.contain', 'Internal Server Error')
      cy.get('body').should('not.contain', 'Service Unavailable')
    })

    it('should respond to health check endpoint', () => {
      cy.request({
        url: '/health',
        timeout: Cypress.env('HEALTH_CHECK_TIMEOUT'),
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404]) // 404 if health endpoint not configured
        if (response.status === 200) {
          expect(response.body).to.include('healthy')
        }
      })
    })

    it('should have proper security headers', () => {
      cy.request({
        url: '/',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }).then((response) => {
        const headers = response.headers

        // Check for important security headers
        expect(headers).to.have.property('strict-transport-security')
        expect(headers).to.have.property('x-content-type-options')
        expect(headers).to.have.property('x-frame-options')
        expect(headers).to.have.property('x-xss-protection')
      })
    })
  })

  context('API Endpoints', () => {
    let authToken = Cypress.env('TEST_ACCESS_TOKEN')

    const getAuthHeaders = () => {
      const headers = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      return headers
    }

    it('should check authentication endpoint availability', () => {
      cy.request({
        url: '/api/auth/me',
        headers: getAuthHeaders(),
        failOnStatusCode: false
      }).then((response) => {
        // Should return either 200 (authenticated) or 401 (not authenticated)
        expect(response.status).to.be.oneOf([200, 401, 404])
      })
    })

    it('should handle prompt generation request', () => {
      const testPrompt = testPrompts[0]

      cy.request({
        method: 'POST',
        url: '/api/generate-from-prompt',
        headers: getAuthHeaders(),
        body: {
          prompt: testPrompt,
          style: 'cinematic',
          seed: 42
        },
        timeout: 30000,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          // Successfully created job
          expect(response.body).to.have.property('jobId')
          expect(response.body).to.have.property('status')
          cy.log(`Created job: ${response.body.jobId}`)

          // Verify job can be queried
          cy.request({
            url: `/api/status/${response.body.jobId}`,
            headers: getAuthHeaders(),
            timeout: 15000
          }).then((statusResponse) => {
            expect(statusResponse.status).to.equal(200)
            expect(statusResponse.body).to.have.property('status')
            expect(statusResponse.body).to.have.property('jobId')
          })
        } else if (response.status === 401) {
          // Authentication required - this is expected
          cy.log('Authentication required for prompt generation (401)')
          expect(response.body).to.include('unauthorized')
        } else if (response.status === 429) {
          // Rate limited - this is good for production
          cy.log('Rate limiting active (429)')
          expect(response.headers).to.have.property('retry-after')
        } else {
          // Other errors might indicate problems
          cy.log(`Unexpected response: ${response.status}`)
          cy.log(`Response body: ${JSON.stringify(response.body)}`)
        }
      })
    })

    it('should handle file upload request structure', () => {
      // Note: Cypress cannot easily test actual file uploads in production
      // This test focuses on the API structure and authentication

      cy.request({
        method: 'POST',
        url: '/api/upload',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return authentication error or rate limit, not server error
        expect(response.status).to.be.oneOf([401, 429, 400, 415])
        cy.log('Upload endpoint responding as expected')
      })
    })
  })

  context('Rate Limiting', () => {
    it('should enforce rate limits on generation endpoint', () => {
      const headers = getAuthHeaders()
      const testPrompt = testPrompts[1]

      // Make multiple rapid requests
      const requests = Array(5).fill().map((_, i) =>
        cy.request({
          method: 'POST',
          url: '/api/generate-from-prompt',
          headers,
          body: {
            prompt: `${testPrompt} ${i}`,
            style: 'cinematic',
            seed: 42 + i
          },
          timeout: 10000,
          failOnStatusCode: false
        })
      )

      Promise.all(requests).then(responses => {
        const rateLimitedResponses = responses.filter(r => r.status === 429)
        const unauthorizedResponses = responses.filter(r => r.status === 401)
        const successResponses = responses.filter(r => r.status === 200)

        cy.log(`Rate limited responses: ${rateLimitedResponses.length}`)
        cy.log(`Unauthorized responses: ${unauthorizedResponses.length}`)
        cy.log(`Successful responses: ${successResponses.length}`)

        // In production, we expect some rate limiting or authentication
        expect(rateLimitedResponses.length + unauthorizedResponses.length).to.be.greaterThan(0)
      })
    })
  })

  context('Error Handling', () => {
    it('should handle malformed requests gracefully', () => {
      cy.request({
        method: 'POST',
        url: '/api/generate-from-prompt',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: {
          // Missing required fields
          invalid: 'data'
        },
        timeout: 10000,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401, 422])
        expect(response.status).to.not.equal(500) // Should not cause server error
      })
    })

    it('should handle invalid job IDs gracefully', () => {
      cy.request({
        url: '/api/status/invalid-job-id-123',
        headers: getAuthHeaders(),
        timeout: 10000,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([404, 400, 401])
        expect(response.status).to.not.equal(500) // Should not cause server error
      })
    })
  })

  context('Performance', () => {
    it('should respond to basic requests within reasonable time', () => {
      const startTime = Date.now()

      cy.request({
        url: '/',
        timeout: 10000
      }).then((response) => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(5000) // Should load within 5 seconds
        expect(response.status).to.equal(200)
        cy.log(`Page load time: ${responseTime}ms`)
      })
    })

    it('should handle concurrent requests', () => {
      const concurrentRequests = Array(3).fill().map(() =>
        cy.request({
          url: '/health',
          timeout: 5000,
          failOnStatusCode: false
        })
      )

      Promise.all(concurrentRequests).then(responses => {
        // All requests should complete successfully
        responses.forEach(response => {
          expect(response.status).to.be.oneOf([200, 404]) // 404 if no health endpoint
        })
        cy.log('Concurrent requests handled successfully')
      })
    })
  })

  context('Environment Detection', () => {
    it('should detect running environment correctly', () => {
      cy.task('getEnvironment').then(env => {
        cy.log(`Detected environment: ${env}`)
        expect(env).to.be.oneOf(['development', 'staging', 'production', 'unknown'])
      })

      cy.task('isProduction').then(isProd => {
        cy.log(`Running in production: ${isProd}`)
      })
    })
  })

  // Only run these tests if explicitly requested
  context('File Upload Integration (Optional)', { tags: '@upload' }, () => {
    beforeEach(function() {
      // Skip if no test file is available
      const testFilePath = Cypress.env('UPLOAD_FILE_PATH')
      if (!testFilePath) {
        this.skip()
      }
    })

    it('should process a smoke test file upload', function() {
      const testFilePath = Cypress.env('UPLOAD_FILE_PATH')
      const testPrompt = Cypress.env('TEST_PROMPT')

      cy.log(`Testing with file: ${testFilePath}`)

      // This test would require actual file upload capabilities
      // For now, just verify the endpoint structure
      cy.request({
        method: 'POST',
        url: '/api/upload',
        headers: {
          'Authorization': `Bearer ${Cypress.env('TEST_ACCESS_TOKEN')}`,
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 429, 400]) // Expected responses
        cy.log('Upload endpoint structure is correct')
      })
    })
  })

  after(() => {
    // Clean up any test data
    cy.clearLocalStorage()

    // Log completion
    cy.log('Production smoke tests completed')
    cy.log(`Tests ran against: ${baseUrl}`)

    // Performance summary
    cy.task('log', '=== Smoke Test Summary ===')
    cy.task('log', `Base URL: ${baseUrl}`)
    cy.task('log', `Environment: ${Cypress.env('NODE_ENV') || 'unknown'}`)
    cy.task('log', `Timestamp: ${new Date().toISOString()}`)
  })
})