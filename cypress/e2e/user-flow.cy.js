describe('MangaMotion User Flow', () => {
  beforeEach(() => {
    // Clear session storage and cookies before each test
    cy.clearCookies()
    cy.clearLocalStorage()
    
    // Start from the landing page for each test
    cy.visit('/')
  })

  it('completes the full user flow from signup to detection results', () => {
    // 1. Landing Page - Click Get Started CTA
    cy.get('[data-cy=landing-cta]').should('be.visible').click()

    // 2. Signup Modal - Fill out the form
    cy.get('[data-cy=signup-modal]').should('be.visible')
    cy.get('[data-cy=name-input]').type('Test User')
    cy.get('[data-cy=email-input]').type('test@example.com')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=signup-button]').click()

    // Wait for signup request to complete
    cy.wait('@signupRequest')

    // 3. Dashboard - Verify redirection and create new project
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy=create-project-button]').click()

    // 4. New Project - Fill project details
    cy.get('[data-cy=project-name]').type('Test Manga Project')
    cy.get('[data-cy=project-description]').type('Test description for manga project')
    cy.get('[data-cy=create-project-submit]').click()

    // 5. Upload Demo File
    const demoFile = 'manga-page.png';
    cy.fixture(demoFile, 'binary')
      .then(Cypress.Blob.binaryStringToBlob)
      .then(fileContent => {
        cy.get('[data-cy=file-upload-input]').attachFile({
          fileContent,
          fileName: demoFile,
          mimeType: 'image/png'
        })
      })

    // Wait for file upload and processing to complete
    cy.wait('@presignRequest')
    cy.wait('@fileUpload')
    cy.wait('@processRequest')

    // 6. Verify Detection Results
    cy.wait('@detectionStatus')
    cy.get('[data-cy=detection-results]').should('be.visible')
    
    // Check if detection results are displayed
    cy.get('[data-cy=detection-item]').should('have.length.at.least', 1)
    cy.get('[data-cy=detection-item]').first().should('contain', 'character')
    cy.get('[data-cy=confidence-badge]').first().should('contain', '95%')
  })

  it('handles file upload errors gracefully', () => {
    // Test error handling for file upload
    cy.intercept('POST', '/api/upload/presign', {
      statusCode: 500,
      body: { error: 'Failed to generate presigned URL' }
    }).as('failedPresign')

    // Login and navigate to upload
    cy.login()
    cy.visit('/dashboard/projects/new')

    // Attempt to upload a file
    const demoFile = 'manga-page.png';
    cy.fixture(demoFile, 'binary')
      .then(Cypress.Blob.binaryStringToBlob)
      .then(fileContent => {
        cy.get('[data-cy=file-upload-input]').attachFile({
          fileContent,
          fileName: demoFile,
          mimeType: 'image/png'
        })
      })

    // Verify error message is shown
    cy.wait('@failedPresign')
    cy.get('[data-cy=upload-error]').should('be.visible')
      .and('contain', 'Failed to upload file')
  })
})
