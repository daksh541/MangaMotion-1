/**
 * Sentry Error Tracking and Performance Monitoring
 *
 * Initializes Sentry for production error tracking and performance monitoring.
 * Configures appropriate sampling, contexts, and integrations for MangaMotion.
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Configuration from environment
const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1;
const SENTRY_PROFILES_SAMPLE_RATE = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Performance monitoring configuration
const PERFORMANCE_INTEGRATIONS = [
  // Add HTTP request tracking
  new Sentry.Integrations.Http({ tracing: true }),

  // Express.js request tracking if available
  ...(typeof require('express') !== 'undefined' ? [new Sentry.Integrations.Express()] : []),

  // Database query tracking (if available)
  ...(typeof require('pg') !== 'undefined' ? [new Sentry.Integrations.Postgres()] : []),

  // Node.js profiling for performance insights
  nodeProfilingIntegration(),
];

// Error filters to reduce noise
const ERROR_FILTERS = [
  // Filter out expected HTTP errors (4xx)
  {
    type: 'ErrorEvent',
    filter: (event) => {
      const statusCode = event.exception?.values?.[0]?.data?.statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return null; // Don't send 4xx errors to Sentry
      }
      return event;
    }
  },

  // Filter out validation errors
  {
    type: 'ErrorEvent',
    filter: (event) => {
      const error = event.exception?.values?.[0]?.value || '';
      if (error.includes('ValidationError') || error.includes('Bad Request')) {
        return null;
      }
      return event;
    }
  }
];

/**
 * Initialize Sentry for production monitoring
 */
function initializeSentry(app = null) {
  // Only initialize in production or when explicitly enabled
  if (NODE_ENV !== 'production' && !SENTRY_DSN) {
    console.log('Sentry initialization skipped: not in production and no DSN provided');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,

      // Performance monitoring
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: SENTRY_PROFILES_SAMPLE_RATE,

      // Release version tracking
      release: process.env.DEPLOY_VERSION || require('../../package.json').version,

      // Server name for instance identification
      serverName: process.env.HOSTNAME || process.env.SERVER_NAME || 'unknown',

      // Integrations
      integrations: PERFORMANCE_INTEGRATIONS,

      // Before sending events
      beforeSend(event, hint) {
        // Apply error filters
        for (const filter of ERROR_FILTERS) {
          const filtered = filter.filter(event);
          if (filtered === null) {
            return null;
          }
          event = filtered;
        }

        // Add custom context
        if (event.contexts === undefined) {
          event.contexts = {};
        }

        // Add application context
        event.contexts.app = {
          name: 'mangamotion-backend',
          version: process.env.DEPLOY_VERSION || 'unknown',
          environment: SENTRY_ENVIRONMENT,
        };

        // Add deployment context
        if (process.env.DEPLOY_TIMESTAMP) {
          event.contexts.deployment = {
            timestamp: process.env.DEPLOY_TIMESTAMP,
            version: process.env.DEPLOY_VERSION || 'unknown',
          };
        }

        // Filter sensitive data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
            sensitiveHeaders.forEach(header => {
              delete event.request.headers[header];
            });
          }

          // Sanitize URLs
          if (event.request.url) {
            event.request.url = event.request.url.replace(/\/api\/status\/[^\/]+/, '/api/status/[jobId]');
          }
        }

        return event;
      },

      // Before sending transactions
      beforeTransaction(transaction) {
        // Filter out health check transactions
        if (transaction.name && (
          transaction.name.includes('/health') ||
          transaction.name.includes('/metrics') ||
          transaction.name.includes('/status')
        )) {
          return null;
        }
        return transaction;
      },

      // Debug mode for development
      debug: NODE_ENV === 'development',

      // Maximum breadcrumb limit
      maxBreadcrumbs: 50,

      // Sample rate for session tracking
      sessionSamplingRate: 0.1,
    });

    console.log(`Sentry initialized successfully in ${SENTRY_ENVIRONMENT} environment`);

    // Set up Express middleware if app provided
    if (app && app.use) {
      const requestHandler = Sentry.Handlers.requestHandler();
      const tracingHandler = Sentry.Handlers.tracingHandler();

      app.use(requestHandler);
      app.use(tracingHandler);

      // Error handler must be last
      app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
          // Don't track 4xx client errors
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
          return true;
        }
      }));

      console.log('Sentry Express middleware configured');
    }

  } catch (error) {
    console.error('Failed to initialize Sentry:', error.message);
  }
}

/**
 * Set user context for Sentry
 */
function setUserContext(user) {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      // Add subscription tier for business context
      subscription_tier: user.subscription_tier || 'free',
    });
  } catch (error) {
    console.warn('Failed to set Sentry user context:', error.message);
  }
}

/**
 * Set job processing context for Sentry
 */
function setJobContext(job) {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  try {
    Sentry.setContext('job', {
      job_id: job.id,
      job_type: job.type,
      status: job.status,
      user_id: job.user_id,
      created_at: job.created_at,
    });

    // Add tags for better filtering
    Sentry.setTag('job.type', job.type);
    Sentry.setTag('job.status', job.status);
  } catch (error) {
    console.warn('Failed to set Sentry job context:', error.message);
  }
}

/**
 * Add performance measurement for job processing
 */
function measureJobProcessing(jobId, operation, callback) {
  if (!Sentry.getCurrentHub().getClient()) {
    return callback();
  }

  const transaction = Sentry.startTransaction({
    name: `job_${operation}`,
    op: 'job.processing',
    tags: {
      job_id: jobId,
      operation: operation,
    },
  });

  return SentryUtils.withScope(scope => {
    scope.setSpan(transaction);

    try {
      const result = callback();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      transaction.setData('error', error.message);
      throw error;
    } finally {
      transaction.finish();
    }
  });
}

/**
 * Capture business metrics
 */
function captureBusinessMetric(metric, data = {}) {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      category: 'business',
      message: metric,
      level: 'info',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn('Failed to capture business metric:', error.message);
  }
}

/**
 * Capture error with additional context
 */
function captureError(error, context = {}) {
  if (!Sentry.getCurrentHub().getClient()) {
    console.error('Error (Sentry not available):', error);
    return;
  }

  try {
    SentryUtils.withScope(scope => {
      // Add additional context
      Object.keys(context).forEach(key => {
        scope.setExtra(key, context[key]);
      });

      // Capture the error
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(error, 'error');
      }
    });
  } catch (sentryError) {
    console.error('Failed to capture error in Sentry:', sentryError);
    console.error('Original error:', error);
  }
}

/**
 * Health check for Sentry
 */
async function healthCheck() {
  if (!Sentry.getCurrentHub().getClient()) {
    return { status: 'disabled', message: 'Sentry not initialized' };
  }

  try {
    // Test Sentry functionality
    Sentry.captureMessage('Sentry health check', 'info');

    return {
      status: 'healthy',
      dsn_configured: !!SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      traces_sample_rate: SENTRY_TRACES_SAMPLE_RATE,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Close Sentry gracefully
 */
function close() {
  if (Sentry.getCurrentHub().getClient()) {
    return Sentry.close(2000).then(() => {
      console.log('Sentry closed successfully');
    }).catch(error => {
      console.warn('Error closing Sentry:', error.message);
    });
  }
  return Promise.resolve();
}

// Sentry utilities alias
const SentryUtils = {
  withScope: Sentry.withScope?.bind(Sentry),
  addBreadcrumb: Sentry.addBreadcrumb?.bind(Sentry),
  setTag: Sentry.setTag?.bind(Sentry),
  setExtra: Sentry.setExtra?.bind(Sentry),
};

// Initialize if called directly
if (require.main === module) {
  initializeSentry();
  healthCheck().then(result => {
    console.log('Sentry health check:', result);
    close();
  });
}

module.exports = {
  initializeSentry,
  setUserContext,
  setJobContext,
  measureJobProcessing,
  captureBusinessMetric,
  captureError,
  healthCheck,
  close,
  Sentry, // Export for advanced usage
};