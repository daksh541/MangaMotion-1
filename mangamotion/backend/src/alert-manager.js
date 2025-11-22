/**
 * Alert Manager
 * 
 * Monitors key metrics and triggers alerts with remediation steps.
 * Tracks:
 * - Queue length > threshold
 * - Worker crash rate
 * - Failed jobs > 5% per minute
 * - Storage usage > 80%
 */

const { getMetricsSummary, getGauge } = require('./metrics');
const { logger } = require('./logger');

// Alert thresholds (configurable via environment)
const THRESHOLDS = {
  QUEUE_LENGTH_WARNING: parseInt(process.env.ALERT_QUEUE_LENGTH_WARNING || '100', 10),
  QUEUE_LENGTH_CRITICAL: parseInt(process.env.ALERT_QUEUE_LENGTH_CRITICAL || '500', 10),
  FAILED_JOBS_RATE_WARNING: parseFloat(process.env.ALERT_FAILED_JOBS_RATE_WARNING || '0.05', 10), // 5%
  FAILED_JOBS_RATE_CRITICAL: parseFloat(process.env.ALERT_FAILED_JOBS_RATE_CRITICAL || '0.10', 10), // 10%
  STORAGE_WARNING: parseInt(process.env.ALERT_STORAGE_WARNING || '80', 10), // 80%
  STORAGE_CRITICAL: parseInt(process.env.ALERT_STORAGE_CRITICAL || '95', 10), // 95%
  WORKER_CRASH_RATE_WARNING: parseFloat(process.env.ALERT_WORKER_CRASH_RATE_WARNING || '0.05', 10), // 5%
  WORKER_CRASH_RATE_CRITICAL: parseFloat(process.env.ALERT_WORKER_CRASH_RATE_CRITICAL || '0.10', 10), // 10%
};

// Alert state tracking (to avoid duplicate alerts)
const alertState = {
  queueLength: null,
  failedJobsRate: null,
  storageUsage: null,
  workerCrashRate: null,
};

// Alert history for trending
const alertHistory = {
  queueLength: [],
  failedJobsRate: [],
  storageUsage: [],
  workerCrashRate: [],
};

const MAX_HISTORY = 60; // Keep last 60 samples

/**
 * Alert severity levels
 */
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Alert class
 */
class Alert {
  constructor(name, severity, message, remediation, metrics = {}) {
    this.id = `${name}-${Date.now()}`;
    this.name = name;
    this.severity = severity;
    this.message = message;
    this.remediation = remediation;
    this.metrics = metrics;
    this.timestamp = new Date().toISOString();
    this.resolved = false;
  }

  /**
   * Get formatted alert message
   */
  format() {
    const icon = this.severity === SEVERITY.CRITICAL ? '🔴' : this.severity === SEVERITY.WARNING ? '🟡' : 'ℹ️';
    return `${icon} [${this.severity.toUpperCase()}] ${this.name}\n${this.message}\n\n📋 Remediation:\n${this.remediation}`;
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      severity: this.severity,
      message: this.message,
      remediation: this.remediation,
      metrics: this.metrics,
      timestamp: this.timestamp,
      resolved: this.resolved,
    };
  }
}

/**
 * Alert Manager class
 */
class AlertManager {
  constructor() {
    this.alerts = [];
    this.activeAlerts = new Map();
    this.alertCallbacks = [];
  }

  /**
   * Register callback for new alerts
   */
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Trigger alert
   */
  triggerAlert(alert) {
    this.alerts.push(alert);
    this.activeAlerts.set(alert.name, alert);

    // Log alert
    logger.error(`ALERT: ${alert.name}`, {
      severity: alert.severity,
      message: alert.message,
      metrics: alert.metrics,
    });

    // Call callbacks
    this.alertCallbacks.forEach(cb => {
      try {
        cb(alert);
      } catch (e) {
        logger.error('Alert callback error', { error: e.message });
      }
    });
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertName) {
    const alert = this.activeAlerts.get(alertName);
    if (alert) {
      alert.resolved = true;
      this.activeAlerts.delete(alertName);
      logger.info(`Alert resolved: ${alertName}`);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get all alerts
   */
  getAllAlerts() {
    return this.alerts;
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    this.alerts = this.alerts.filter(alert => {
      const age = now - new Date(alert.timestamp).getTime();
      return age < maxAge;
    });
  }
}

// Global alert manager instance
const alertManager = new AlertManager();

/**
 * Check queue length
 */
function checkQueueLength() {
  const queueLength = getGauge('queue_length');
  const timestamp = Date.now();

  // Track history
  alertHistory.queueLength.push({ value: queueLength, timestamp });
  if (alertHistory.queueLength.length > MAX_HISTORY) {
    alertHistory.queueLength.shift();
  }

  // Check thresholds
  if (queueLength > THRESHOLDS.QUEUE_LENGTH_CRITICAL) {
    const alert = new Alert(
      'QueueLengthCritical',
      SEVERITY.CRITICAL,
      `Queue length is ${queueLength} jobs (critical threshold: ${THRESHOLDS.QUEUE_LENGTH_CRITICAL})`,
      `1. Check worker status: docker logs mangamotion-worker | tail -50
2. Verify worker is running: docker ps | grep worker
3. Check worker CPU/memory: docker stats mangamotion-worker
4. Scale workers: docker-compose up -d --scale worker=3
5. Monitor queue: redis-cli LLEN ai-job:queue`,
      { queueLength, threshold: THRESHOLDS.QUEUE_LENGTH_CRITICAL }
    );

    if (alertState.queueLength !== SEVERITY.CRITICAL) {
      alertManager.triggerAlert(alert);
      alertState.queueLength = SEVERITY.CRITICAL;
    }
  } else if (queueLength > THRESHOLDS.QUEUE_LENGTH_WARNING) {
    const alert = new Alert(
      'QueueLengthWarning',
      SEVERITY.WARNING,
      `Queue length is ${queueLength} jobs (warning threshold: ${THRESHOLDS.QUEUE_LENGTH_WARNING})`,
      `1. Monitor queue depth: watch -n 1 'redis-cli LLEN ai-job:queue'
2. Check worker throughput: docker logs mangamotion-worker | grep processed
3. Consider scaling workers if trend is increasing
4. Check for slow jobs: docker logs mangamotion-worker | grep -i slow`,
      { queueLength, threshold: THRESHOLDS.QUEUE_LENGTH_WARNING }
    );

    if (alertState.queueLength !== SEVERITY.WARNING) {
      alertManager.triggerAlert(alert);
      alertState.queueLength = SEVERITY.WARNING;
    }
  } else if (alertState.queueLength !== null) {
    alertManager.resolveAlert('QueueLengthWarning');
    alertManager.resolveAlert('QueueLengthCritical');
    alertState.queueLength = null;
  }
}

/**
 * Check failed jobs rate
 */
function checkFailedJobsRate() {
  const metrics = getMetricsSummary();
  const processed = metrics.counters.job_processed_total;
  const failed = metrics.counters.job_failed_total;
  
  const failureRate = processed > 0 ? failed / processed : 0;
  const timestamp = Date.now();

  // Track history
  alertHistory.failedJobsRate.push({ value: failureRate, timestamp });
  if (alertHistory.failedJobsRate.length > MAX_HISTORY) {
    alertHistory.failedJobsRate.shift();
  }

  // Check thresholds
  if (failureRate > THRESHOLDS.FAILED_JOBS_RATE_CRITICAL) {
    const alert = new Alert(
      'FailedJobsRateCritical',
      SEVERITY.CRITICAL,
      `Failed jobs rate is ${(failureRate * 100).toFixed(2)}% (critical threshold: ${(THRESHOLDS.FAILED_JOBS_RATE_CRITICAL * 100).toFixed(2)}%)`,
      `1. Check API logs: docker logs mangamotion-api | grep -i error | tail -50
2. Check worker logs: docker logs mangamotion-worker | grep -i error | tail -50
3. Verify database connectivity: psql -h postgres -U mmuser -d mangamotion -c "SELECT 1;"
4. Check MinIO health: curl http://minio:9000/minio/health/live
5. Review failed jobs: redis-cli LRANGE failed-jobs 0 -1`,
      { failureRate: (failureRate * 100).toFixed(2) + '%', threshold: (THRESHOLDS.FAILED_JOBS_RATE_CRITICAL * 100).toFixed(2) + '%' }
    );

    if (alertState.failedJobsRate !== SEVERITY.CRITICAL) {
      alertManager.triggerAlert(alert);
      alertState.failedJobsRate = SEVERITY.CRITICAL;
    }
  } else if (failureRate > THRESHOLDS.FAILED_JOBS_RATE_WARNING) {
    const alert = new Alert(
      'FailedJobsRateWarning',
      SEVERITY.WARNING,
      `Failed jobs rate is ${(failureRate * 100).toFixed(2)}% (warning threshold: ${(THRESHOLDS.FAILED_JOBS_RATE_WARNING * 100).toFixed(2)}%)`,
      `1. Monitor failure trend: watch -n 5 'curl -s http://localhost:3000/api/metrics | jq .counters'
2. Check recent errors: docker logs mangamotion-api --tail 100 | grep error
3. Verify all services are healthy: docker-compose ps
4. Check database performance: psql -c "SELECT count(*) FROM pg_stat_activity;"
5. Review application logs for patterns`,
      { failureRate: (failureRate * 100).toFixed(2) + '%', threshold: (THRESHOLDS.FAILED_JOBS_RATE_WARNING * 100).toFixed(2) + '%' }
    );

    if (alertState.failedJobsRate !== SEVERITY.WARNING) {
      alertManager.triggerAlert(alert);
      alertState.failedJobsRate = SEVERITY.WARNING;
    }
  } else if (alertState.failedJobsRate !== null) {
    alertManager.resolveAlert('FailedJobsRateWarning');
    alertManager.resolveAlert('FailedJobsRateCritical');
    alertState.failedJobsRate = null;
  }
}

/**
 * Check storage usage
 */
function checkStorageUsage(storageUsagePercent) {
  const timestamp = Date.now();

  // Track history
  alertHistory.storageUsage.push({ value: storageUsagePercent, timestamp });
  if (alertHistory.storageUsage.length > MAX_HISTORY) {
    alertHistory.storageUsage.shift();
  }

  // Check thresholds
  if (storageUsagePercent > THRESHOLDS.STORAGE_CRITICAL) {
    const alert = new Alert(
      'StorageCritical',
      SEVERITY.CRITICAL,
      `Storage usage is ${storageUsagePercent.toFixed(2)}% (critical threshold: ${THRESHOLDS.STORAGE_CRITICAL}%)`,
      `1. Check disk space: df -h /data
2. Identify large files: du -sh /data/* | sort -rh | head -10
3. Clean up old files: find /data -type f -mtime +30 -delete
4. Check MinIO usage: curl http://minio:9000/minio/health/live
5. Consider archiving or deleting old jobs
6. Scale storage: Add more disk space or implement cleanup policies`,
      { storageUsage: storageUsagePercent.toFixed(2) + '%', threshold: THRESHOLDS.STORAGE_CRITICAL + '%' }
    );

    if (alertState.storageUsage !== SEVERITY.CRITICAL) {
      alertManager.triggerAlert(alert);
      alertState.storageUsage = SEVERITY.CRITICAL;
    }
  } else if (storageUsagePercent > THRESHOLDS.STORAGE_WARNING) {
    const alert = new Alert(
      'StorageWarning',
      SEVERITY.WARNING,
      `Storage usage is ${storageUsagePercent.toFixed(2)}% (warning threshold: ${THRESHOLDS.STORAGE_WARNING}%)`,
      `1. Monitor storage trend: watch -n 60 'df -h /data'
2. Identify growing directories: du -sh /data/* | sort -rh
3. Plan cleanup: Identify and archive old jobs
4. Implement lifecycle policies: Configure storage expiration
5. Monitor growth rate: Check if usage is increasing rapidly`,
      { storageUsage: storageUsagePercent.toFixed(2) + '%', threshold: THRESHOLDS.STORAGE_WARNING + '%' }
    );

    if (alertState.storageUsage !== SEVERITY.WARNING) {
      alertManager.triggerAlert(alert);
      alertState.storageUsage = SEVERITY.WARNING;
    }
  } else if (alertState.storageUsage !== null) {
    alertManager.resolveAlert('StorageWarning');
    alertManager.resolveAlert('StorageCritical');
    alertState.storageUsage = null;
  }
}

/**
 * Check worker crash rate
 */
function checkWorkerCrashRate(crashCount, totalWorkers) {
  if (totalWorkers === 0) return;

  const crashRate = crashCount / totalWorkers;
  const timestamp = Date.now();

  // Track history
  alertHistory.workerCrashRate.push({ value: crashRate, timestamp });
  if (alertHistory.workerCrashRate.length > MAX_HISTORY) {
    alertHistory.workerCrashRate.shift();
  }

  // Check thresholds
  if (crashRate > THRESHOLDS.WORKER_CRASH_RATE_CRITICAL) {
    const alert = new Alert(
      'WorkerCrashRateCritical',
      SEVERITY.CRITICAL,
      `Worker crash rate is ${(crashRate * 100).toFixed(2)}% (critical threshold: ${(THRESHOLDS.WORKER_CRASH_RATE_CRITICAL * 100).toFixed(2)}%)`,
      `1. Check worker status: docker ps | grep worker
2. View worker logs: docker logs mangamotion-worker --tail 100
3. Check for OOM errors: docker logs mangamotion-worker | grep -i "out of memory"
4. Increase worker memory: Edit docker-compose.yml and increase memory limit
5. Restart workers: docker-compose restart worker
6. Check for resource contention: docker stats
7. Review error patterns in logs`,
      { crashRate: (crashRate * 100).toFixed(2) + '%', crashCount, totalWorkers }
    );

    if (alertState.workerCrashRate !== SEVERITY.CRITICAL) {
      alertManager.triggerAlert(alert);
      alertState.workerCrashRate = SEVERITY.CRITICAL;
    }
  } else if (crashRate > THRESHOLDS.WORKER_CRASH_RATE_WARNING) {
    const alert = new Alert(
      'WorkerCrashRateWarning',
      SEVERITY.WARNING,
      `Worker crash rate is ${(crashRate * 100).toFixed(2)}% (warning threshold: ${(THRESHOLDS.WORKER_CRASH_RATE_WARNING * 100).toFixed(2)}%)`,
      `1. Monitor worker health: watch -n 5 'docker ps | grep worker'
2. Check recent crashes: docker logs mangamotion-worker --tail 50
3. Monitor resource usage: docker stats mangamotion-worker
4. Check for memory leaks: Monitor memory usage over time
5. Review job processing logs for errors`,
      { crashRate: (crashRate * 100).toFixed(2) + '%', crashCount, totalWorkers }
    );

    if (alertState.workerCrashRate !== SEVERITY.WARNING) {
      alertManager.triggerAlert(alert);
      alertState.workerCrashRate = SEVERITY.WARNING;
    }
  } else if (alertState.workerCrashRate !== null) {
    alertManager.resolveAlert('WorkerCrashRateWarning');
    alertManager.resolveAlert('WorkerCrashRateCritical');
    alertState.workerCrashRate = null;
  }
}

/**
 * Get alert history
 */
function getAlertHistory(alertType) {
  return alertHistory[alertType] || [];
}

/**
 * Get alert statistics
 */
function getAlertStats() {
  return {
    totalAlerts: alertManager.alerts.length,
    activeAlerts: alertManager.getActiveAlerts().length,
    alertsByName: alertManager.getActiveAlerts().reduce((acc, alert) => {
      acc[alert.name] = alert.toJSON();
      return acc;
    }, {}),
    history: {
      queueLength: getAlertHistory('queueLength'),
      failedJobsRate: getAlertHistory('failedJobsRate'),
      storageUsage: getAlertHistory('storageUsage'),
      workerCrashRate: getAlertHistory('workerCrashRate'),
    },
  };
}

/**
 * Run all checks
 */
function runAllChecks(storageUsagePercent = 0, crashCount = 0, totalWorkers = 1) {
  checkQueueLength();
  checkFailedJobsRate();
  checkStorageUsage(storageUsagePercent);
  checkWorkerCrashRate(crashCount, totalWorkers);
}

module.exports = {
  Alert,
  AlertManager,
  alertManager,
  checkQueueLength,
  checkFailedJobsRate,
  checkStorageUsage,
  checkWorkerCrashRate,
  runAllChecks,
  getAlertHistory,
  getAlertStats,
  SEVERITY,
  THRESHOLDS,
};
