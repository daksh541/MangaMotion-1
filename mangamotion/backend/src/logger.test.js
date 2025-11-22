/**
 * Logger Tests
 */

const { createLogger, logger } = require('./logger');

describe('Logger', () => {
  let logOutput = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    logOutput = [];
    
    // Capture console output
    console.log = jest.fn((msg) => logOutput.push(msg));
    console.error = jest.fn((msg) => logOutput.push(msg));
    console.warn = jest.fn((msg) => logOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('Basic Logging', () => {
    test('should log info message', () => {
      logger.info('Test message');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.level).toBe('info');
      expect(output.message).toBe('Test message');
    });

    test('should log error message', () => {
      logger.error('Error occurred', { error: 'Test error' });
      const output = JSON.parse(logOutput[0]);
      expect(output.level).toBe('error');
      expect(output.error).toBe('Test error');
    });

    test('should log warning message', () => {
      logger.warn('Warning message', { severity: 'high' });
      const output = JSON.parse(logOutput[0]);
      expect(output.level).toBe('warn');
      expect(output.severity).toBe('high');
    });

    test('should include timestamp', () => {
      logger.info('Test');
      const output = JSON.parse(logOutput[0]);
      expect(output.timestamp).toBeDefined();
      expect(output.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Job Logging', () => {
    test('should log job created event', () => {
      logger.logJob('created', 'job-123', { user_id: 'user-456', file_count: 5 });
      const output = JSON.parse(logOutput[0]);
      expect(output.job_id).toBe('job-123');
      expect(output.event).toBe('created');
      expect(output.user_id).toBe('user-456');
      expect(output.file_count).toBe(5);
    });

    test('should log job completion', () => {
      logger.logJobComplete('job-123', 5000, { status: 'success' });
      const output = JSON.parse(logOutput[0]);
      expect(output.job_id).toBe('job-123');
      expect(output.duration_ms).toBe(5000);
      expect(output.status).toBe('completed');
    });

    test('should log job failure', () => {
      const error = new Error('Test error');
      logger.logJobFailed('job-123', error, 2, { file_count: 5 });
      const output = JSON.parse(logOutput[0]);
      expect(output.job_id).toBe('job-123');
      expect(output.error).toBe('Test error');
      expect(output.attempts).toBe(2);
      expect(output.file_count).toBe(5);
    });
  });

  describe('Operation Logging', () => {
    test('should log successful operation', () => {
      logger.logOperation('thumbnail_generation', 2500, true, { object_key: 's3://bucket/thumb.jpg' });
      const output = JSON.parse(logOutput[0]);
      expect(output.operation).toBe('thumbnail_generation');
      expect(output.duration_ms).toBe(2500);
      expect(output.success).toBe(true);
      expect(output.object_key).toBe('s3://bucket/thumb.jpg');
    });

    test('should log failed operation', () => {
      logger.logOperation('thumbnail_generation', 1000, false, { error: 'FFmpeg failed' });
      const output = JSON.parse(logOutput[0]);
      expect(output.success).toBe(false);
    });
  });

  describe('Context Preservation', () => {
    test('should preserve context across logs', () => {
      const contextLogger = createLogger({ user_id: 'user-123', job_id: 'job-456' });
      contextLogger.info('Test message');
      const output = JSON.parse(logOutput[0]);
      expect(output.user_id).toBe('user-123');
      expect(output.job_id).toBe('job-456');
    });

    test('should override context', () => {
      const contextLogger = createLogger({ user_id: 'user-123' });
      contextLogger.info('Test', { user_id: 'user-789' });
      const output = JSON.parse(logOutput[0]);
      expect(output.user_id).toBe('user-789');
    });
  });

  describe('Log Levels', () => {
    test('should respect LOG_LEVEL environment variable', () => {
      const originalLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'warn';
      
      // Reimport to pick up new env var
      delete require.cache[require.resolve('./logger')];
      const { logger: warnLogger } = require('./logger');
      
      logOutput = [];
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      
      // Only warn and above should be logged
      expect(logOutput.length).toBe(1);
      
      process.env.LOG_LEVEL = originalLevel;
    });
  });
});
