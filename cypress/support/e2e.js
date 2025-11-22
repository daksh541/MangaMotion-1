// *******************************************
// This support file is required for your tests to run.
// The commands you write here are available to all test files.
// *******************************************

import './commands'

// Mock server setup
beforeEach(() => {
  // Mock API responses
  cy.intercept('POST', '/api/auth/signup', {
    statusCode: 200,
    body: {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      },
      token: 'test-jwt-token'
    }
  }).as('signupRequest')

  cy.intercept('POST', '/api/upload/presign', {
    statusCode: 200,
    body: {
      url: 'https://mock-s3-upload-url.com/upload',
      fields: {
        key: 'test-file-123',
        'Content-Type': 'image/png'
      },
      fileId: 'test-file-123'
    }
  }).as('presignRequest')

  cy.intercept('POST', 'https://mock-s3-upload-url.com/upload', {
    statusCode: 204
  }).as('fileUpload')

  cy.intercept('POST', '/api/detection/process', {
    statusCode: 200,
    body: {
      id: 'detection-123',
      status: 'processing'
    }
  }).as('processRequest')

  cy.intercept('GET', '/api/detection/status/detection-123', {
    statusCode: 200,
    body: {
      id: 'detection-123',
      status: 'completed',
      results: [
        { id: 1, type: 'character', confidence: 0.95, bbox: [10, 10, 100, 100] },
        { id: 2, type: 'speech_bubble', confidence: 0.92, bbox: [150, 50, 200, 150] }
      ]
    }
  }).as('detectionStatus')
})
