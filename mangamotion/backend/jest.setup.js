/**
 * Jest Setup File
 * 
 * Runs before all tests to configure the test environment
 */

// Disable console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TRACING_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';
process.env.METRICS_ENABLED = 'true';

// Set default timeout
jest.setTimeout(10000);

// Mock external services
jest.mock('./src/tracing', () => ({
  initializeTracing: jest.fn(),
  tracingMiddleware: (req, res, next) => next(),
  withSpan: (name, fn) => fn(),
  setAttribute: jest.fn(),
  recordException: jest.fn(),
  addEvent: jest.fn(),
  getTracer: jest.fn(),
  startSpan: jest.fn()
}));

jest.mock('./src/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logJob: jest.fn(),
    logJobComplete: jest.fn(),
    logJobFailed: jest.fn(),
    logOperation: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));
