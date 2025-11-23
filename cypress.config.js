const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Configure baseUrl based on environment
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',

    setupNodeEvents(on, config) {
      // Task for production smoke test
      on('task', {
        // Log task for debugging
        log(message) {
          console.log(message)
          return null
        },

        // Check if running against production
        isProduction() {
          return config.baseUrl.includes('https://') && !config.baseUrl.includes('localhost')
        },

        // Environment check task
        getEnvironment() {
          const baseUrl = config.baseUrl
          if (baseUrl.includes('localhost')) return 'development'
          if (baseUrl.includes('staging')) return 'staging'
          if (baseUrl.includes('yourdomain.com')) return 'production'
          return 'unknown'
        },

        // Test database connectivity (if needed)
        async checkDatabase() {
          if (!config.baseUrl.includes('localhost')) {
            console.log('Skipping database check in production environment')
            return true
          }
          // Add database connectivity check for local testing
          return true
        }
      })

      // Environment-specific configuration
      const isProduction = process.env.CYPRESS_baseUrl?.includes('https://') && !process.env.CYPRESS_BASE_URL?.includes('localhost')

      if (isProduction) {
        // Production settings
        config.defaultCommandTimeout = 15000 // Longer timeout for production
        config.requestTimeout = 10000
        config.responseTimeout = 60000 // Extended for slow production processing
        config.video = false // Disable video recording in production for performance
        config.screenshotOnRunFailure = false // Disable screenshots in production
        config.retries = {
          runMode: 2,
          openMode: 0
        }
      } else {
        // Development settings
        config.defaultCommandTimeout = 8000
        config.requestTimeout = 8000
        config.responseTimeout = 30000
        config.video = true
        config.screenshotOnRunFailure = true
        config.retries = {
          runMode: 1,
          openMode: 0
        }
      }

      // Set test user credentials from environment
      config.env = {
        ...config.env,
        TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
        TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'testpassword123',
        TEST_ACCESS_TOKEN: process.env.TEST_ACCESS_TOKEN,
        PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://yourdomain.com',
      }

      return config
    },

    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',

    // Browser configuration
    viewportWidth: 1280,
    viewportHeight: 720,
    videoCompression: 32,
    chromeWebSecurity: false, // Allow cross-origin requests for testing

    // Test timeouts (extended for production)
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 60000,
    taskTimeout: 60000,

    // Execution settings
    numTestsKeptInMemory: 0, // Memory optimization
    trashAssetsBeforeRuns: true,

    // Global test settings
    experimentalStudio: true,
    experimentalWebKitSupport: true,

    // Exclude files from test run
    excludeSpecPattern: [
      '**/*.skip.js',
      '**/*.only.js',
      'cypress/e2e/debug/**/*'
    ],

    // Environment-specific overrides
    env: {
      // Production environment settings
      PRODUCTION_SMOKE_TEST_TIMEOUT: 300000, // 5 minutes for smoke tests
      JOB_PROCESSING_TIMEOUT: 600000, // 10 minutes for job completion
      HEALTH_CHECK_TIMEOUT: 10000, // 10 seconds for health checks

      // Test data settings
      UPLOAD_FILE_PATH: process.env.UPLOAD_FILE_PATH || '/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov',
      TEST_PROMPT: 'smoke-test: convert to anime-style',
      TEST_STYLE: 'cinematic',
      TEST_SEED: 42
    }
  },
  // Component testing (if needed in future)
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack'
    }
  }
})
