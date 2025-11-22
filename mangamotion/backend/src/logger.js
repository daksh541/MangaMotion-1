/**
 * Structured Logging Module
 * 
 * Provides JSON structured logging with context fields:
 * - job_id: Job identifier
 * - user_id: User identifier
 * - object_key: S3/storage object key
 * - attempts: Job attempt count
 * - timestamp: ISO timestamp
 * - level: log level (info, warn, error, debug)
 * - message: Log message
 * - duration_ms: Operation duration
 * - error: Error details
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json'; // json or text

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LEVELS[LOG_LEVEL] || LEVELS.info;

/**
 * Format log entry as JSON
 */
function formatJSON(level, message, context = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  });
}

/**
 * Format log entry as text
 */
function formatText(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? ' ' + JSON.stringify(context)
    : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Write log to console
 */
function writeLog(level, message, context = {}) {
  if (LEVELS[level] < currentLevel) return;

  const formatted = LOG_FORMAT === 'json'
    ? formatJSON(level, message, context)
    : formatText(level, message, context);

  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * Create a logger instance with default context
 */
function createLogger(defaultContext = {}) {
  return {
    debug: (message, context = {}) => writeLog('debug', message, { ...defaultContext, ...context }),
    info: (message, context = {}) => writeLog('info', message, { ...defaultContext, ...context }),
    warn: (message, context = {}) => writeLog('warn', message, { ...defaultContext, ...context }),
    error: (message, context = {}) => writeLog('error', message, { ...defaultContext, ...context }),
    
    /**
     * Log job event with standard fields
     */
    logJob: (event, jobId, context = {}) => {
      writeLog('info', `Job ${event}`, {
        job_id: jobId,
        event,
        ...context
      });
    },

    /**
     * Log job completion with metrics
     */
    logJobComplete: (jobId, durationMs, context = {}) => {
      writeLog('info', 'Job completed', {
        job_id: jobId,
        duration_ms: durationMs,
        status: 'completed',
        ...context
      });
    },

    /**
     * Log job failure with error details
     */
    logJobFailed: (jobId, error, attempts, context = {}) => {
      writeLog('error', 'Job failed', {
        job_id: jobId,
        error: error.message || String(error),
        error_stack: error.stack,
        attempts,
        status: 'failed',
        ...context
      });
    },

    /**
     * Log operation with timing
     */
    logOperation: (operation, durationMs, success = true, context = {}) => {
      const level = success ? 'info' : 'warn';
      writeLog(level, `Operation ${operation}`, {
        operation,
        duration_ms: durationMs,
        success,
        ...context
      });
    }
  };
}

// Global logger instance
const globalLogger = createLogger();

module.exports = {
  createLogger,
  logger: globalLogger,
  writeLog
};
