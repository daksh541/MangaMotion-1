/**
 * Metrics Tests
 */

const {
  incrementCounter,
  recordHistogram,
  setGauge,
  getGauge,
  formatPrometheus,
  getMetricsSummary,
  resetMetrics
} = require('./metrics');

describe('Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('Counters', () => {
    test('should increment counter', () => {
      incrementCounter('job_processed_total');
      incrementCounter('job_processed_total');
      
      const summary = getMetricsSummary();
      expect(summary.counters.job_processed_total).toBe(2);
    });

    test('should track multiple counter types', () => {
      incrementCounter('job_processed_total');
      incrementCounter('job_failed_total');
      incrementCounter('scan_clean_total');
      
      const summary = getMetricsSummary();
      expect(summary.counters.job_processed_total).toBe(1);
      expect(summary.counters.job_failed_total).toBe(1);
      expect(summary.counters.scan_clean_total).toBe(1);
    });
  });

  describe('Histograms', () => {
    test('should record histogram values', () => {
      recordHistogram('job_processing_seconds', 0.5);
      recordHistogram('job_processing_seconds', 1.5);
      recordHistogram('job_processing_seconds', 2.5);
      
      const summary = getMetricsSummary();
      expect(summary.histograms.job_processing_seconds.count).toBe(3);
      expect(summary.histograms.job_processing_seconds.sum).toBe(4.5);
    });

    test('should calculate percentiles', () => {
      // Add values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
      for (let i = 1; i <= 10; i++) {
        recordHistogram('job_processing_seconds', i);
      }
      
      const summary = getMetricsSummary();
      expect(summary.histograms.job_processing_seconds.p50).toBeGreaterThan(4);
      expect(summary.histograms.job_processing_seconds.p95).toBeGreaterThan(8);
      expect(summary.histograms.job_processing_seconds.p99).toBeGreaterThan(9);
    });

    test('should calculate average', () => {
      recordHistogram('job_processing_seconds', 1);
      recordHistogram('job_processing_seconds', 2);
      recordHistogram('job_processing_seconds', 3);
      
      const summary = getMetricsSummary();
      expect(summary.histograms.job_processing_seconds.avg).toBe(2);
    });

    test('should limit histogram size', () => {
      // Add more than 1000 values
      for (let i = 0; i < 1100; i++) {
        recordHistogram('job_processing_seconds', Math.random());
      }
      
      const summary = getMetricsSummary();
      expect(summary.histograms.job_processing_seconds.count).toBeLessThanOrEqual(1000);
    });
  });

  describe('Gauges', () => {
    test('should set gauge value', () => {
      setGauge('queue_length', 42);
      expect(getGauge('queue_length')).toBe(42);
    });

    test('should update gauge value', () => {
      setGauge('queue_length', 10);
      setGauge('queue_length', 20);
      expect(getGauge('queue_length')).toBe(20);
    });

    test('should track multiple gauges', () => {
      setGauge('queue_length', 42);
      setGauge('active_jobs', 5);
      setGauge('failed_jobs_dlq', 3);
      
      const summary = getMetricsSummary();
      expect(summary.gauges.queue_length).toBe(42);
      expect(summary.gauges.active_jobs).toBe(5);
      expect(summary.gauges.failed_jobs_dlq).toBe(3);
    });
  });

  describe('Prometheus Format', () => {
    test('should format metrics as Prometheus text', () => {
      incrementCounter('job_processed_total');
      incrementCounter('job_processed_total');
      recordHistogram('job_processing_seconds', 1.5);
      setGauge('queue_length', 10);
      
      const prometheus = formatPrometheus();
      
      expect(prometheus).toContain('job_processed_total 2');
      expect(prometheus).toContain('queue_length 10');
      expect(prometheus).toContain('job_processing_seconds_count 1');
      expect(prometheus).toContain('# TYPE job_processed_total counter');
      expect(prometheus).toContain('# TYPE job_processing_seconds histogram');
    });

    test('should include histogram buckets', () => {
      recordHistogram('job_processing_seconds', 0.05);
      recordHistogram('job_processing_seconds', 0.3);
      recordHistogram('job_processing_seconds', 1.5);
      
      const prometheus = formatPrometheus();
      
      expect(prometheus).toContain('job_processing_seconds_bucket{le="0.1"}');
      expect(prometheus).toContain('job_processing_seconds_bucket{le="1"}');
      expect(prometheus).toContain('job_processing_seconds_bucket{le="+Inf"}');
    });

    test('should include HELP and TYPE comments', () => {
      incrementCounter('job_processed_total');
      
      const prometheus = formatPrometheus();
      
      expect(prometheus).toContain('# HELP job_processed_total');
      expect(prometheus).toContain('# TYPE job_processed_total counter');
    });
  });

  describe('JSON Summary', () => {
    test('should return metrics summary as JSON', () => {
      incrementCounter('job_processed_total');
      recordHistogram('job_processing_seconds', 1.5);
      setGauge('queue_length', 10);
      
      const summary = getMetricsSummary();
      
      expect(summary).toHaveProperty('counters');
      expect(summary).toHaveProperty('gauges');
      expect(summary).toHaveProperty('histograms');
    });

    test('should include all counter types', () => {
      const summary = getMetricsSummary();
      
      expect(summary.counters).toHaveProperty('job_processed_total');
      expect(summary.counters).toHaveProperty('job_failed_total');
      expect(summary.counters).toHaveProperty('scan_clean_total');
      expect(summary.counters).toHaveProperty('scan_infected_total');
    });

    test('should include histogram statistics', () => {
      recordHistogram('job_processing_seconds', 1);
      recordHistogram('job_processing_seconds', 2);
      recordHistogram('job_processing_seconds', 3);
      
      const summary = getMetricsSummary();
      const histogram = summary.histograms.job_processing_seconds;
      
      expect(histogram).toHaveProperty('count');
      expect(histogram).toHaveProperty('sum');
      expect(histogram).toHaveProperty('avg');
      expect(histogram).toHaveProperty('p50');
      expect(histogram).toHaveProperty('p95');
      expect(histogram).toHaveProperty('p99');
    });
  });

  describe('Reset', () => {
    test('should reset all metrics', () => {
      incrementCounter('job_processed_total');
      recordHistogram('job_processing_seconds', 1.5);
      setGauge('queue_length', 10);
      
      resetMetrics();
      
      const summary = getMetricsSummary();
      expect(summary.counters.job_processed_total).toBe(0);
      expect(summary.histograms.job_processing_seconds.count).toBe(0);
      expect(summary.gauges.queue_length).toBe(0);
    });
  });

  describe('Disabled Metrics', () => {
    test('should not record metrics when disabled', () => {
      const originalEnabled = process.env.METRICS_ENABLED;
      process.env.METRICS_ENABLED = 'false';
      
      // Reimport to pick up new env var
      delete require.cache[require.resolve('./metrics')];
      const { incrementCounter: disabledIncrement, getMetricsSummary: disabledSummary } = require('./metrics');
      
      disabledIncrement('job_processed_total');
      
      const summary = disabledSummary();
      expect(summary.counters.job_processed_total).toBe(0);
      
      process.env.METRICS_ENABLED = originalEnabled;
    });
  });
});
