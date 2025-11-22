/**
 * Service Level Objectives (SLOs)
 * 
 * Defines and tracks SLOs for MangaMotion:
 * - Availability: 99.5% uptime
 * - Error Rate: <5% failed jobs
 * - Latency: P95 < 5 seconds
 * - Throughput: >10 jobs/minute
 */

const { getMetricsSummary, getGauge } = require('./metrics');
const { logger } = require('./logger');

/**
 * SLO definitions
 */
const SLOs = {
  AVAILABILITY: {
    name: 'Availability',
    description: 'System uptime percentage',
    target: 0.995, // 99.5%
    window: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  ERROR_RATE: {
    name: 'Error Rate',
    description: 'Percentage of failed jobs',
    target: 0.05, // 5%
    window: 24 * 60 * 60 * 1000, // 24 hours
  },
  LATENCY_P95: {
    name: 'Latency (P95)',
    description: '95th percentile job processing time',
    target: 5000, // 5 seconds in ms
    window: 24 * 60 * 60 * 1000, // 24 hours
  },
  THROUGHPUT: {
    name: 'Throughput',
    description: 'Minimum jobs processed per minute',
    target: 10, // jobs/minute
    window: 60 * 60 * 1000, // 1 hour
  },
  QUEUE_DEPTH: {
    name: 'Queue Depth',
    description: 'Maximum queue length',
    target: 500, // jobs
    window: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * SLO tracking
 */
class SLOTracker {
  constructor() {
    this.startTime = Date.now();
    this.measurements = {
      availability: [],
      errorRate: [],
      latency: [],
      throughput: [],
      queueDepth: [],
    };
    this.violations = [];
    this.lastCheck = Date.now();
  }

  /**
   * Record availability measurement
   */
  recordAvailability(isAvailable) {
    this.measurements.availability.push({
      value: isAvailable ? 1 : 0,
      timestamp: Date.now(),
    });
    this.pruneOldMeasurements('availability', SLOs.AVAILABILITY.window);
  }

  /**
   * Record error rate measurement
   */
  recordErrorRate(errorRate) {
    this.measurements.errorRate.push({
      value: errorRate,
      timestamp: Date.now(),
    });
    this.pruneOldMeasurements('errorRate', SLOs.ERROR_RATE.window);
  }

  /**
   * Record latency measurement
   */
  recordLatency(p95Latency) {
    this.measurements.latency.push({
      value: p95Latency,
      timestamp: Date.now(),
    });
    this.pruneOldMeasurements('latency', SLOs.LATENCY_P95.window);
  }

  /**
   * Record throughput measurement
   */
  recordThroughput(jobsPerMinute) {
    this.measurements.throughput.push({
      value: jobsPerMinute,
      timestamp: Date.now(),
    });
    this.pruneOldMeasurements('throughput', SLOs.THROUGHPUT.window);
  }

  /**
   * Record queue depth measurement
   */
  recordQueueDepth(queueLength) {
    this.measurements.queueDepth.push({
      value: queueLength,
      timestamp: Date.now(),
    });
    this.pruneOldMeasurements('queueDepth', SLOs.QUEUE_DEPTH.window);
  }

  /**
   * Remove measurements older than window
   */
  pruneOldMeasurements(type, window) {
    const now = Date.now();
    this.measurements[type] = this.measurements[type].filter(m => {
      return now - m.timestamp < window;
    });
  }

  /**
   * Calculate availability percentage
   */
  getAvailability() {
    if (this.measurements.availability.length === 0) return 100;
    const sum = this.measurements.availability.reduce((acc, m) => acc + m.value, 0);
    return (sum / this.measurements.availability.length) * 100;
  }

  /**
   * Calculate average error rate
   */
  getErrorRate() {
    if (this.measurements.errorRate.length === 0) return 0;
    const sum = this.measurements.errorRate.reduce((acc, m) => acc + m.value, 0);
    return sum / this.measurements.errorRate.length;
  }

  /**
   * Get P95 latency
   */
  getLatencyP95() {
    if (this.measurements.latency.length === 0) return 0;
    const sorted = this.measurements.latency
      .map(m => m.value)
      .sort((a, b) => a - b);
    const index = Math.ceil((95 / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get average throughput
   */
  getThroughput() {
    if (this.measurements.throughput.length === 0) return 0;
    const sum = this.measurements.throughput.reduce((acc, m) => acc + m.value, 0);
    return sum / this.measurements.throughput.length;
  }

  /**
   * Get max queue depth
   */
  getMaxQueueDepth() {
    if (this.measurements.queueDepth.length === 0) return 0;
    return Math.max(...this.measurements.queueDepth.map(m => m.value));
  }

  /**
   * Check if SLO is met
   */
  isSLOMet(sloName) {
    switch (sloName) {
      case 'AVAILABILITY':
        return this.getAvailability() >= SLOs.AVAILABILITY.target * 100;
      case 'ERROR_RATE':
        return this.getErrorRate() <= SLOs.ERROR_RATE.target;
      case 'LATENCY_P95':
        return this.getLatencyP95() <= SLOs.LATENCY_P95.target;
      case 'THROUGHPUT':
        return this.getThroughput() >= SLOs.THROUGHPUT.target;
      case 'QUEUE_DEPTH':
        return this.getMaxQueueDepth() <= SLOs.QUEUE_DEPTH.target;
      default:
        return false;
    }
  }

  /**
   * Get SLO status
   */
  getSLOStatus(sloName) {
    const slo = SLOs[sloName];
    if (!slo) return null;

    let actual, target, unit;

    switch (sloName) {
      case 'AVAILABILITY':
        actual = this.getAvailability();
        target = SLOs.AVAILABILITY.target * 100;
        unit = '%';
        break;
      case 'ERROR_RATE':
        actual = this.getErrorRate() * 100;
        target = SLOs.ERROR_RATE.target * 100;
        unit = '%';
        break;
      case 'LATENCY_P95':
        actual = this.getLatencyP95();
        target = SLOs.LATENCY_P95.target;
        unit = 'ms';
        break;
      case 'THROUGHPUT':
        actual = this.getThroughput();
        target = SLOs.THROUGHPUT.target;
        unit = 'jobs/min';
        break;
      case 'QUEUE_DEPTH':
        actual = this.getMaxQueueDepth();
        target = SLOs.QUEUE_DEPTH.target;
        unit = 'jobs';
        break;
      default:
        return null;
    }

    const met = this.isSLOMet(sloName);
    const percentage = (actual / target) * 100;

    return {
      name: slo.name,
      description: slo.description,
      actual: actual.toFixed(2),
      target: target.toFixed(2),
      unit,
      met,
      percentage: percentage.toFixed(2),
      status: met ? '✅ MET' : '❌ VIOLATED',
    };
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatus() {
    return {
      timestamp: new Date().toISOString(),
      slos: {
        availability: this.getSLOStatus('AVAILABILITY'),
        errorRate: this.getSLOStatus('ERROR_RATE'),
        latencyP95: this.getSLOStatus('LATENCY_P95'),
        throughput: this.getSLOStatus('THROUGHPUT'),
        queueDepth: this.getSLOStatus('QUEUE_DEPTH'),
      },
      summary: {
        totalSLOs: Object.keys(SLOs).length,
        metSLOs: Object.keys(SLOs).filter(key => this.isSLOMet(key)).length,
        violatedSLOs: Object.keys(SLOs).filter(key => !this.isSLOMet(key)).length,
      },
    };
  }

  /**
   * Check all SLOs and log violations
   */
  checkAllSLOs() {
    const status = this.getAllSLOStatus();

    Object.values(status.slos).forEach(slo => {
      if (slo && !slo.met) {
        logger.warn(`SLO VIOLATION: ${slo.name}`, {
          actual: slo.actual,
          target: slo.target,
          unit: slo.unit,
          percentage: slo.percentage,
        });

        this.violations.push({
          slo: slo.name,
          timestamp: Date.now(),
          actual: parseFloat(slo.actual),
          target: parseFloat(slo.target),
        });
      }
    });

    return status;
  }

  /**
   * Get SLO violations
   */
  getViolations(limit = 100) {
    return this.violations.slice(-limit);
  }

  /**
   * Get error budget
   */
  getErrorBudget() {
    const errorRate = this.getErrorRate();
    const budget = SLOs.ERROR_RATE.target;
    const remaining = Math.max(0, budget - errorRate);
    const percentageRemaining = (remaining / budget) * 100;

    return {
      budget: (budget * 100).toFixed(2) + '%',
      used: (errorRate * 100).toFixed(2) + '%',
      remaining: (remaining * 100).toFixed(2) + '%',
      percentageRemaining: percentageRemaining.toFixed(2) + '%',
      status: remaining > 0 ? '✅ Budget available' : '❌ Budget exhausted',
    };
  }

  /**
   * Get uptime budget
   */
  getUptimeBudget() {
    const availability = this.getAvailability() / 100;
    const budget = SLOs.AVAILABILITY.target;
    const remaining = Math.max(0, budget - availability);
    const percentageRemaining = (remaining / budget) * 100;

    return {
      budget: (budget * 100).toFixed(2) + '%',
      actual: (availability * 100).toFixed(2) + '%',
      remaining: (remaining * 100).toFixed(2) + '%',
      percentageRemaining: percentageRemaining.toFixed(2) + '%',
      status: remaining > 0 ? '✅ Budget available' : '❌ Budget exhausted',
    };
  }
}

// Global SLO tracker instance
const sloTracker = new SLOTracker();

/**
 * Update SLOs from current metrics
 */
function updateSLOs() {
  const metrics = getMetricsSummary();
  
  // Calculate error rate
  const processed = metrics.counters.job_processed_total;
  const failed = metrics.counters.job_failed_total;
  const errorRate = processed > 0 ? failed / processed : 0;
  sloTracker.recordErrorRate(errorRate);

  // Record latency
  const latencyP95 = metrics.histograms.job_processing_seconds.p95 * 1000; // Convert to ms
  sloTracker.recordLatency(latencyP95);

  // Record throughput (jobs per minute)
  // This is simplified - in production, track over time windows
  const throughput = processed > 0 ? processed / 60 : 0;
  sloTracker.recordThroughput(throughput);

  // Record queue depth
  const queueDepth = getGauge('queue_length');
  sloTracker.recordQueueDepth(queueDepth);

  // Record availability (assume available if metrics are being collected)
  sloTracker.recordAvailability(true);
}

module.exports = {
  SLOs,
  SLOTracker,
  sloTracker,
  updateSLOs,
};
