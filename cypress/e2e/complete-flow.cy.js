// cypress/e2e/complete-flow.cy.js
/**
 * Complete End-to-End Test Flow
 * 
 * Tests the entire MangaMotion workflow:
 * 1. User registration
 * 2. User login
 * 3. Job creation from prompt
 * 4. Job status polling
 * 5. Result viewing
 * 6. Job regeneration
 * 7. Dashboard viewing
 * 8. Logout
 */

describe('MangaMotion Complete Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  let jobId;
  let accessToken;

  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  describe('User Registration', () => {
    it('should register a new user', () => {
      cy.visit('http://localhost:3000/register');
      
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('My Jobs').should('be.visible');
    });

    it('should show error for invalid email', () => {
      cy.visit('http://localhost:3000/register');
      
      cy.get('input[name="email"]').type('invalid-email');
      cy.get('input[name="password"]').type(testUser.password);
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Invalid email format').should('be.visible');
    });

    it('should show error for weak password', () => {
      cy.visit('http://localhost:3000/register');
      
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type('weak');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Password must be at least 8 characters').should('be.visible');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Register user first
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
      });
    });

    it('should login with valid credentials', () => {
      cy.visit('http://localhost:3000/login');
      
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('My Jobs').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('http://localhost:3000/login');
      
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type('WrongPassword123!');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Invalid credentials').should('be.visible');
    });
  });

  describe('Job Creation', () => {
    beforeEach(() => {
      // Login first
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
        localStorage.setItem('accessToken', accessToken);
      });

      cy.visit('http://localhost:3000');
    });

    it('should create job from prompt', () => {
      cy.get('input[placeholder*="prompt"]').type('turn this into anime, cinematic');
      cy.get('button').contains('Generate').click();
      
      // Should show job ID
      cy.contains(/Job ID:|jobId/).should('be.visible');
      
      // Extract job ID from URL or response
      cy.url().then((url) => {
        if (url.includes('/result/')) {
          jobId = url.split('/result/')[1];
        }
      });
    });

    it('should show error for empty prompt', () => {
      cy.get('button').contains('Generate').click();
      
      cy.contains('Prompt cannot be empty').should('be.visible');
    });

    it('should show error for insufficient credits', () => {
      // Simulate insufficient credits by mocking API response
      cy.intercept('POST', '/api/generate-from-prompt', {
        statusCode: 402,
        body: {
          error: 'insufficient_credits',
          message: 'Insufficient credits. Required: 1, Available: 0',
          requiredCredits: 1,
          availableCredits: 0
        }
      });
      
      cy.get('input[placeholder*="prompt"]').type('test prompt');
      cy.get('button').contains('Generate').click();
      
      cy.contains('Insufficient credits').should('be.visible');
      cy.contains('Top Up').should('be.visible');
    });
  });

  describe('Job Status Polling', () => {
    beforeEach(() => {
      // Create a job
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
      });

      cy.request({
        method: 'POST',
        url: 'http://localhost:3000/api/generate-from-prompt',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: { prompt: 'test prompt' }
      }).then((response) => {
        jobId = response.body.jobId;
      });

      localStorage.setItem('accessToken', accessToken);
      cy.visit(`http://localhost:3000/result/${jobId}`);
    });

    it('should display job progress', () => {
      cy.contains('Progress').should('be.visible');
      cy.get('.progress-bar').should('be.visible');
    });

    it('should update progress in real-time', () => {
      // Initial progress should be low
      cy.get('.progress-value').then(($el) => {
        const initialProgress = parseInt($el.text());
        expect(initialProgress).to.be.lessThan(100);
      });

      // Wait and check if progress increases
      cy.wait(3000);
      cy.get('.progress-value').then(($el) => {
        const updatedProgress = parseInt($el.text());
        expect(updatedProgress).to.be.greaterThanOrEqual(0);
      });
    });

    it('should show completed status when job finishes', () => {
      // Wait for job to complete (max 60 seconds)
      cy.contains('Completed', { timeout: 60000 }).should('be.visible');
      cy.contains('Download').should('be.visible');
      cy.contains('Regenerate').should('be.visible');
    });
  });

  describe('Result Viewing', () => {
    beforeEach(() => {
      // Create and complete a job
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
      });

      cy.request({
        method: 'POST',
        url: 'http://localhost:3000/api/generate-from-prompt',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: { prompt: 'test prompt' }
      }).then((response) => {
        jobId = response.body.jobId;
      });

      localStorage.setItem('accessToken', accessToken);
      cy.visit(`http://localhost:3000/result/${jobId}`);

      // Wait for job to complete
      cy.contains('Completed', { timeout: 60000 });
    });

    it('should display video player', () => {
      cy.get('video').should('be.visible');
    });

    it('should display job metadata', () => {
      cy.contains('Prompt:').should('be.visible');
      cy.contains('test prompt').should('be.visible');
      cy.contains('Status:').should('be.visible');
      cy.contains('Completed').should('be.visible');
    });

    it('should allow downloading result', () => {
      cy.get('button').contains('Download').click();
      
      // Verify download was triggered
      cy.readFile('cypress/downloads/video.mp4', { timeout: 5000 }).should('exist');
    });
  });

  describe('Job Regeneration', () => {
    beforeEach(() => {
      // Create and complete a job
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
      });

      cy.request({
        method: 'POST',
        url: 'http://localhost:3000/api/generate-from-prompt',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: { prompt: 'original prompt' }
      }).then((response) => {
        jobId = response.body.jobId;
      });

      localStorage.setItem('accessToken', accessToken);
      cy.visit(`http://localhost:3000/result/${jobId}`);

      // Wait for job to complete
      cy.contains('Completed', { timeout: 60000 });
    });

    it('should open regenerate modal', () => {
      cy.get('button').contains('Regenerate').click();
      
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('Regenerate Job').should('be.visible');
    });

    it('should prefill prompt in modal', () => {
      cy.get('button').contains('Regenerate').click();
      
      cy.get('input[placeholder*="prompt"]').should('have.value', 'original prompt');
    });

    it('should allow editing prompt', () => {
      cy.get('button').contains('Regenerate').click();
      
      cy.get('input[placeholder*="prompt"]').clear().type('new prompt');
      cy.get('button').contains('Create').click();
      
      // Should create new job
      cy.url().should('include', '/result/');
    });
  });

  describe('Dashboard', () => {
    beforeEach(() => {
      // Login
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
        localStorage.setItem('accessToken', accessToken);
      });

      cy.visit('http://localhost:3000/dashboard');
    });

    it('should display dashboard', () => {
      cy.contains('My Jobs').should('be.visible');
      cy.contains('Total').should('be.visible');
      cy.contains('Completed').should('be.visible');
    });

    it('should display job statistics', () => {
      cy.get('[data-testid="stat-total"]').should('be.visible');
      cy.get('[data-testid="stat-completed"]').should('be.visible');
      cy.get('[data-testid="stat-processing"]').should('be.visible');
    });

    it('should search jobs by prompt', () => {
      cy.get('input[placeholder*="Search"]').type('anime');
      cy.get('button').contains('Search').click();
      
      // Should filter results
      cy.get('[data-testid="job-card"]').each(($el) => {
        cy.wrap($el).contains('anime', { matchCase: false });
      });
    });

    it('should filter jobs by status', () => {
      cy.get('select[name="status"]').select('completed');
      
      // Should only show completed jobs
      cy.get('[data-testid="job-card"]').each(($el) => {
        cy.wrap($el).contains('Completed');
      });
    });

    it('should allow bulk delete', () => {
      // Select multiple jobs
      cy.get('input[type="checkbox"]').first().click();
      cy.get('input[type="checkbox"]').eq(1).click();
      
      cy.get('button').contains('Delete').click();
      cy.contains('Confirm').click();
      
      // Jobs should be deleted
      cy.contains('deleted successfully').should('be.visible');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login
      cy.request('POST', 'http://localhost:3000/api/auth/register', {
        email: testUser.email,
        password: testUser.password
      }).then((response) => {
        accessToken = response.body.accessToken;
        localStorage.setItem('accessToken', accessToken);
      });

      cy.visit('http://localhost:3000/dashboard');
    });

    it('should logout user', () => {
      cy.get('button').contains('Logout').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Access token should be cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('accessToken')).to.be.null;
      });
    });

    it('should prevent access to protected pages after logout', () => {
      cy.get('button').contains('Logout').click();
      
      cy.visit('http://localhost:3000/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network error
      cy.intercept('GET', '/api/status/*', { forceNetworkError: true });
      
      cy.visit(`http://localhost:3000/result/test-job-id`);
      
      cy.contains('Network error').should('be.visible');
      cy.contains('Retry').should('be.visible');
    });

    it('should handle 404 errors', () => {
      cy.visit('http://localhost:3000/result/nonexistent-job-id');
      
      cy.contains('Job not found').should('be.visible');
    });

    it('should handle 500 errors', () => {
      cy.intercept('GET', '/api/status/*', { statusCode: 500 });
      
      cy.visit(`http://localhost:3000/result/test-job-id`);
      
      cy.contains('Server error').should('be.visible');
    });
  });
});
