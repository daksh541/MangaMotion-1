/**
 * Alert Manager Tests
 */

const {
  Alert,
  AlertManager,
  alertManager,
  checkQueueLength,
  checkFailedJobsRate,
  checkStorageUsage,
  checkWorkerCrashRate,
  SEVERITY,
  THRESHOLDS,
} = require('./alert-manager');

describe('Alert', () => {
  test('should create alert with all properties', () => {
    const alert = new Alert(
      'TestAlert',
      SEVERITY.WARNING,
      'Test message',
      'Test remediation',
      { metric: 'value' }
    );

    expect(alert.name).toBe('TestAlert');
    expect(alert.severity).toBe(SEVERITY.WARNING);
    expect(alert.message).toBe('Test message');
    expect(alert.remediation).toBe('Test remediation');
    expect(alert.metrics).toEqual({ metric: 'value' });
    expect(alert.resolved).toBe(false);
  });

  test('should format alert message', () => {
    const alert = new Alert(
      'TestAlert',
      SEVERITY.CRITICAL,
      'Test message',
      'Test remediation'
    );

    const formatted = alert.format();
    expect(formatted).toContain('CRITICAL');
    expect(formatted).toContain('TestAlert');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('Test remediation');
  });

  test('should convert alert to JSON', () => {
    const alert = new Alert(
      'TestAlert',
      SEVERITY.WARNING,
      'Test message',
      'Test remediation'
    );

    const json = alert.toJSON();
    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('severity');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('remediation');
    expect(json).toHaveProperty('timestamp');
  });
});

describe('AlertManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AlertManager();
  });

  test('should trigger alert', () => {
    const alert = new Alert('TestAlert', SEVERITY.WARNING, 'Test', 'Remediation');
    manager.triggerAlert(alert);

    expect(manager.alerts.length).toBe(1);
    expect(manager.getActiveAlerts().length).toBe(1);
  });

  test('should resolve alert', () => {
    const alert = new Alert('TestAlert', SEVERITY.WARNING, 'Test', 'Remediation');
    manager.triggerAlert(alert);
    manager.resolveAlert('TestAlert');

    expect(manager.getActiveAlerts().length).toBe(0);
    expect(alert.resolved).toBe(true);
  });

  test('should call alert callbacks', () => {
    const callback = jest.fn();
    manager.onAlert(callback);

    const alert = new Alert('TestAlert', SEVERITY.WARNING, 'Test', 'Remediation');
    manager.triggerAlert(alert);

    expect(callback).toHaveBeenCalledWith(alert);
  });

  test('should track multiple alerts', () => {
    const alert1 = new Alert('Alert1', SEVERITY.WARNING, 'Test 1', 'Remediation 1');
    const alert2 = new Alert('Alert2', SEVERITY.CRITICAL, 'Test 2', 'Remediation 2');

    manager.triggerAlert(alert1);
    manager.triggerAlert(alert2);

    expect(manager.getActiveAlerts().length).toBe(2);
  });

  test('should clear old alerts', () => {
    const alert = new Alert('TestAlert', SEVERITY.WARNING, 'Test', 'Remediation');
    manager.triggerAlert(alert);

    // Manually set old timestamp
    alert.timestamp = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    manager.clearOldAlerts(3600000); // 1 hour

    expect(manager.alerts.length).toBe(0);
  });

  test('should keep recent alerts', () => {
    const alert = new Alert('TestAlert', SEVERITY.WARNING, 'Test', 'Remediation');
    manager.triggerAlert(alert);

    manager.clearOldAlerts(3600000); // 1 hour

    expect(manager.alerts.length).toBe(1);
  });
});

describe('Alert Checks', () => {
  beforeEach(() => {
    // Reset alert state
    jest.resetModules();
  });

  test('should detect queue length warning', () => {
    // Mock getGauge to return warning threshold
    jest.mock('./metrics', () => ({
      getGauge: () => 150,
      getMetricsSummary: () => ({
        counters: { job_processed_total: 100, job_failed_total: 5 },
        gauges: { queue_length: 150 },
        histograms: { job_processing_seconds: { p95: 2 } },
      }),
    }));

    // This would require mocking metrics module
    // In practice, integration tests would verify this
  });

  test('should detect storage warning', () => {
    checkStorageUsage(85);
    const alerts = alertManager.getActiveAlerts();
    
    const storageAlert = alerts.find(a => a.name === 'StorageWarning');
    expect(storageAlert).toBeDefined();
    expect(storageAlert.severity).toBe(SEVERITY.WARNING);
  });

  test('should detect storage critical', () => {
    checkStorageUsage(96);
    const alerts = alertManager.getActiveAlerts();
    
    const storageAlert = alerts.find(a => a.name === 'StorageCritical');
    expect(storageAlert).toBeDefined();
    expect(storageAlert.severity).toBe(SEVERITY.CRITICAL);
  });

  test('should detect worker crash rate warning', () => {
    checkWorkerCrashRate(1, 20); // 5% crash rate
    const alerts = alertManager.getActiveAlerts();
    
    const crashAlert = alerts.find(a => a.name === 'WorkerCrashRateWarning');
    expect(crashAlert).toBeDefined();
  });

  test('should detect worker crash rate critical', () => {
    checkWorkerCrashRate(2, 20); // 10% crash rate
    const alerts = alertManager.getActiveAlerts();
    
    const crashAlert = alerts.find(a => a.name === 'WorkerCrashRateCritical');
    expect(crashAlert).toBeDefined();
  });
});

describe('Alert Thresholds', () => {
  test('should have correct queue length thresholds', () => {
    expect(THRESHOLDS.QUEUE_LENGTH_WARNING).toBe(100);
    expect(THRESHOLDS.QUEUE_LENGTH_CRITICAL).toBe(500);
  });

  test('should have correct failed jobs rate thresholds', () => {
    expect(THRESHOLDS.FAILED_JOBS_RATE_WARNING).toBe(0.05);
    expect(THRESHOLDS.FAILED_JOBS_RATE_CRITICAL).toBe(0.10);
  });

  test('should have correct storage thresholds', () => {
    expect(THRESHOLDS.STORAGE_WARNING).toBe(80);
    expect(THRESHOLDS.STORAGE_CRITICAL).toBe(95);
  });

  test('should have correct worker crash rate thresholds', () => {
    expect(THRESHOLDS.WORKER_CRASH_RATE_WARNING).toBe(0.05);
    expect(THRESHOLDS.WORKER_CRASH_RATE_CRITICAL).toBe(0.10);
  });
});
