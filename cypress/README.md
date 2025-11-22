# MangaMotion E2E Tests

This directory contains end-to-end (E2E) tests for the MangaMotion application using Cypress.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MangaMotion frontend server running on `http://localhost:3000`
- MangaMotion backend API accessible at the configured endpoints

## Installation

1. Install dependencies:
   ```bash
   npm install cypress @testing-library/cypress cypress-file-upload --save-dev
   ```

2. Start the Cypress Test Runner:
   ```bash
   npx cypress open
   ```
   Or run tests headlessly:
   ```bash
   npx cypress run
   ```

## Test Structure

- `cypress/e2e/` - Contains all test files
- `cypress/fixtures/` - Test data and mock files
- `cypress/support/` - Custom commands and global configurations

## Writing Tests

- Use data-cy attributes for reliable element selection
- Group related tests in describe blocks
- Mock API responses to test different scenarios
- Keep tests independent and isolated

## Running Specific Tests

Run a specific test file:
```bash
npx cypress run --spec "cypress/e2e/user-flow.cy.js"
```

## Best Practices

1. Use custom commands for common actions (e.g., login)
2. Keep tests focused and small
3. Use fixtures for test data
4. Mock external dependencies
5. Add meaningful test descriptions
6. Test both happy paths and error cases

## Debugging

- Use `cy.pause()` to pause test execution
- Use `cy.debug()` to debug specific commands
- Check the Cypress Test Runner for detailed error messages
- Use `cy.screenshot()` to capture test failures
