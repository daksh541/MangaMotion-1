/**
 * Prometheus Metrics Module
 * 
 * Exposes metrics for monitoring:
 * - job_processed_total: Total jobs processed (counter)
 * - job_failed_total: Total jobs failed (counter)
 * - job_processing_seconds: Job processing duration (histogram)
 * - queue_length: Current queue length (gauge)
 * - job_attempts: Job attempt count (histogram)
 * - scan_status: Scan results (counter)
 */

const METRICS_ENABLED = process.env.METRICS_ENABLED !== 'false';

// Simple in-memory metrics (no external dependency)
const metrics = {
  // Counters
  job_processed_total: { value: 0, labels: {} },
  job_failed_total: { value: 0, labels: {} },
  job_skipped_total: { value: 0, labels: {} },
  scan_clean_total: { value: 0, labels: {} },
  scan_infected_total: { value: 0, labels: {} },
  
  // Histograms (stored as arrays for percentile calculation)
  job_processing_seconds: { buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], values: [] },
  job_attempts: { buckets: [1, 2, 3, 5], values: [] },
  
  // Gauges
  queue_length: { value: 0 },
  active_jobs: { value: 0 },
  failed_jobs_dlq: { value: 0 }
};

/**
 * Increment a counter metric
 */
function incrementCounter(metricName, labels = {}) {
  if (!METRICS_ENABLED) return;
  
  if (!metrics[metricName]) {
    metrics[metricName] = { value: 0, labels: {} };
  }
  metrics[metricName].value++;
}

/**
 * Record a histogram value
 */
function recordHistogram(metricName, value) {
  if (!METRICS_ENABLED) return;
  
  if (!metrics[metricName]) {
    metrics[metricName] = { buckets: [], values: [] };
  }
  metrics[metricName].values.push(value);
  
  // Keep only last 1000 values to prevent memory bloat
  if (metrics[metricName].values.length > 1000) {
    metrics[metricName].values = metrics[metricName].values.slice(-1000);
  }
}

/**
 * Set a gauge value
 */
function setGauge(metricName, value) {
  if (!METRICS_ENABLED) return;
  
  if (!metrics[metricName]) {
    metrics[metricName] = { value: 0 };
  }
  metrics[metricName].value = value;
}

/**
 * Get gauge value
 */
function getGauge(metricName) {
  return metrics[metricName]?.value || 0;
}

/**
 * Calculate percentile from histogram values
 */
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Format metrics in Prometheus text format
 */
function formatPrometheus() {
  let output = '# HELP job_processed_total Total number of jobs processed\n';
  output += '# TYPE job_processed_total counter\n';
  output += `job_processed_total ${metrics.job_processed_total.value}\n\n`;

  output += '# HELP job_failed_total Total number of jobs failed\n';
  output += '# TYPE job_failed_total counter\n';
  output += `job_failed_total ${metrics.job_failed_total.value}\n\n`;

  output += '# HELP job_skipped_total Total number of jobs skipped\n';
  output += '# TYPE job_skipped_total counter\n';
  output += `job_skipped_total ${metrics.job_skipped_total.value}\n\n`;

  output += '# HELP scan_clean_total Total number of clean scans\n';
  output += '# TYPE scan_clean_total counter\n';
  output += `scan_clean_total ${metrics.scan_clean_total.value}\n\n`;

  output += '# HELP scan_infected_total Total number of infected files detected\n';
  output += '# TYPE scan_infected_total counter\n';
  output += `scan_infected_total ${metrics.scan_infected_total.value}\n\n`;

  // Job processing seconds histogram
  output += '# HELP job_processing_seconds Job processing duration in seconds\n';
  output += '# TYPE job_processing_seconds histogram\n';
  const values = metrics.job_processing_seconds.values;
  const buckets = metrics.job_processing_seconds.buckets;
  
  for (const bucket of buckets) {
    const count = values.filter(v => v <= bucket).length;
    output += `job_processing_seconds_bucket{le="${bucket}"} ${count}\n`;
  }
  output += `job_processing_seconds_bucket{le="+Inf"} ${values.length}\n`;
  output += `job_processing_seconds_sum ${values.reduce((a, b) => a + b, 0)}\n`;
  output += `job_processing_seconds_count ${values.length}\n\n`;

  // Job attempts histogram
  output += '# HELP job_attempts Job attempt count\n';
  output += '# TYPE job_attempts histogram\n';
  const attemptValues = metrics.job_attempts.values;
  const attemptBuckets = metrics.job_attempts.buckets;
  
  for (const bucket of attemptBuckets) {
    const count = attemptValues.filter(v => v <= bucket).length;
    output += `job_attempts_bucket{le="${bucket}"} ${count}\n`;
  }
  output += `job_attempts_bucket{le="+Inf"} ${attemptValues.length}\n`;
  output += `job_attempts_sum ${attemptValues.reduce((a, b) => a + b, 0)}\n`;
  output += `job_attempts_count ${attemptValues.length}\n\n`;

  // Gauges
  output += '# HELP queue_length Current queue length\n';
  output += '# TYPE queue_length gauge\n';
  output += `queue_length ${metrics.queue_length.value}\n\n`;

  output += '# HELP active_jobs Current number of active jobs\n';
  output += '# TYPE active_jobs gauge\n';
  output += `active_jobs ${metrics.active_jobs.value}\n\n`;

  output += '# HELP failed_jobs_dlq Current number of failed jobs in DLQ\n';
  output += '# TYPE failed_jobs_dlq gauge\n';
  output += `failed_jobs_dlq ${metrics.failed_jobs_dlq.value}\n`;

  return output;
}

/**
 * Get metrics summary as JSON
 */
function getMetricsSummary() {
  const processingValues = metrics.job_processing_seconds.values;
  const attemptValues = metrics.job_attempts.values;

  return {
    counters: {
      job_processed_total: metrics.job_processed_total.value,
      job_failed_total: metrics.job_failed_total.value,
      job_skipped_total: metrics.job_skipped_total.value,
      scan_clean_total: metrics.scan_clean_total.value,
      scan_infected_total: metrics.scan_infected_total.value
    },
    gauges: {
      queue_length: metrics.queue_length.value,
      active_jobs: metrics.active_jobs.value,
      failed_jobs_dlq: metrics.failed_jobs_dlq.value
    },
    histograms: {
      job_processing_seconds: {
        count: processingValues.length,
        sum: processingValues.reduce((a, b) => a + b, 0),
        avg: processingValues.length > 0 ? processingValues.reduce((a, b) => a + b, 0) / processingValues.length : 0,
        p50: calculatePercentile(processingValues, 50),
        p95: calculatePercentile(processingValues, 95),
        p99: calculatePercentile(processingValues, 99)
      },
      job_attempts: {
        count: attemptValues.length,
        sum: attemptValues.reduce((a, b) => a + b, 0),
        avg: attemptValues.length > 0 ? attemptValues.reduce((a, b) => a + b, 0) / attemptValues.length : 0,
        p50: calculatePercentile(attemptValues, 50),
        p95: calculatePercentile(attemptValues, 95),
        p99: calculatePercentile(attemptValues, 99)
      }
    }
  };
}

/**
 * Reset all metrics (for testing)
 */
function resetMetrics() {
  metrics.job_processed_total.value = 0;
  metrics.job_failed_total.value = 0;
  metrics.job_skipped_total.value = 0;
  metrics.scan_clean_total.value = 0;
  metrics.scan_infected_total.value = 0;
  metrics.job_processing_seconds.values = [];
  metrics.job_attempts.values = [];
  metrics.queue_length.value = 0;
  metrics.active_jobs.value = 0;
  metrics.failed_jobs_dlq.value = 0;
}

module.exports = {
  incrementCounter,
  recordHistogram,
  setGauge,
  getGauge,
  formatPrometheus,
  getMetricsSummary,
  resetMetrics
};
