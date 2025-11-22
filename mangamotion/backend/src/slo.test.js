/**
 * SLO Tracker Tests
 */

const { SLOs, SLOTracker } = require('./slo');

describe('SLOTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new SLOTracker();
  });

  describe('Availability', () => {
    test('should calculate availability percentage', () => {
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);
      tracker.recordAvailability(false);

      const availability = tracker.getAvailability();
      expect(availability).toBeCloseTo(66.67, 1);
    });

    test('should return 100% for all available', () => {
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);

      expect(tracker.getAvailability()).toBe(100);
    });

    test('should return 0% for all unavailable', () => {
      tracker.recordAvailability(false);
      tracker.recordAvailability(false);
      tracker.recordAvailability(false);

      expect(tracker.getAvailability()).toBe(0);
    });
  });

  describe('Error Rate', () => {
    test('should calculate average error rate', () => {
      tracker.recordErrorRate(0.02);
      tracker.recordErrorRate(0.03);
      tracker.recordErrorRate(0.05);

      const errorRate = tracker.getErrorRate();
      expect(errorRate).toBeCloseTo(0.033, 2);
    });

    test('should return 0 for no measurements', () => {
      expect(tracker.getErrorRate()).toBe(0);
    });
  });

  describe('Latency', () => {
    test('should calculate P95 latency', () => {
      for (let i = 1; i <= 100; i++) {
        tracker.recordLatency(i * 10);
      }

      const p95 = tracker.getLatencyP95();
      expect(p95).toBeGreaterThan(900);
      expect(p95).toBeLessThanOrEqual(1000);
    });

    test('should return 0 for no measurements', () => {
      expect(tracker.getLatencyP95()).toBe(0);
    });
  });

  describe('Throughput', () => {
    test('should calculate average throughput', () => {
      tracker.recordThroughput(10);
      tracker.recordThroughput(15);
      tracker.recordThroughput(20);

      const throughput = tracker.getThroughput();
      expect(throughput).toBe(15);
    });

    test('should return 0 for no measurements', () => {
      expect(tracker.getThroughput()).toBe(0);
    });
  });

  describe('Queue Depth', () => {
    test('should track maximum queue depth', () => {
      tracker.recordQueueDepth(100);
      tracker.recordQueueDepth(200);
      tracker.recordQueueDepth(150);

      expect(tracker.getMaxQueueDepth()).toBe(200);
    });

    test('should return 0 for no measurements', () => {
      expect(tracker.getMaxQueueDepth()).toBe(0);
    });
  });

  describe('SLO Status', () => {
    test('should report SLO met when within target', () => {
      tracker.recordErrorRate(0.03); // 3% < 5% target

      const status = tracker.getSLOStatus('ERROR_RATE');
      expect(status.met).toBe(true);
      expect(status.status).toContain('✅');
    });

    test('should report SLO violated when exceeding target', () => {
      tracker.recordErrorRate(0.08); // 8% > 5% target

      const status = tracker.getSLOStatus('ERROR_RATE');
      expect(status.met).toBe(false);
      expect(status.status).toContain('❌');
    });

    test('should calculate percentage of target', () => {
      tracker.recordErrorRate(0.025); // 2.5% of 5% = 50%

      const status = tracker.getSLOStatus('ERROR_RATE');
      expect(parseFloat(status.percentage)).toBe(50);
    });
  });

  describe('All SLO Status', () => {
    test('should return status for all SLOs', () => {
      tracker.recordAvailability(true);
      tracker.recordErrorRate(0.03);
      tracker.recordLatency(3000);
      tracker.recordThroughput(15);
      tracker.recordQueueDepth(200);

      const allStatus = tracker.getAllSLOStatus();

      expect(allStatus).toHaveProperty('timestamp');
      expect(allStatus).toHaveProperty('slos');
      expect(allStatus).toHaveProperty('summary');
      expect(allStatus.slos).toHaveProperty('availability');
      expect(allStatus.slos).toHaveProperty('errorRate');
      expect(allStatus.slos).toHaveProperty('latencyP95');
      expect(allStatus.slos).toHaveProperty('throughput');
      expect(allStatus.slos).toHaveProperty('queueDepth');
    });

    test('should count met and violated SLOs', () => {
      tracker.recordAvailability(true);
      tracker.recordErrorRate(0.03); // Met
      tracker.recordLatency(6000); // Violated (> 5000ms)
      tracker.recordThroughput(15); // Met
      tracker.recordQueueDepth(200); // Met

      const allStatus = tracker.getAllSLOStatus();

      expect(allStatus.summary.totalSLOs).toBe(5);
      expect(allStatus.summary.metSLOs).toBeGreaterThan(0);
      expect(allStatus.summary.violatedSLOs).toBeGreaterThan(0);
    });
  });

  describe('SLO Violations', () => {
    test('should track SLO violations', () => {
      tracker.recordErrorRate(0.08); // Violates 5% target
      tracker.checkAllSLOs();

      const violations = tracker.getViolations();
      expect(violations.length).toBeGreaterThan(0);
    });

    test('should limit violations returned', () => {
      for (let i = 0; i < 150; i++) {
        tracker.recordErrorRate(0.08);
      }
      tracker.checkAllSLOs();

      const violations = tracker.getViolations(50);
      expect(violations.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Budget', () => {
    test('should calculate error budget', () => {
      tracker.recordErrorRate(0.02); // 2% of 5% budget

      const budget = tracker.getErrorBudget();
      expect(budget).toHaveProperty('budget');
      expect(budget).toHaveProperty('used');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('status');
    });

    test('should show budget available when under limit', () => {
      tracker.recordErrorRate(0.02); // 2% < 5%

      const budget = tracker.getErrorBudget();
      expect(budget.status).toContain('✅');
    });

    test('should show budget exhausted when over limit', () => {
      tracker.recordErrorRate(0.08); // 8% > 5%

      const budget = tracker.getErrorBudget();
      expect(budget.status).toContain('❌');
    });
  });

  describe('Uptime Budget', () => {
    test('should calculate uptime budget', () => {
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);

      const budget = tracker.getUptimeBudget();
      expect(budget).toHaveProperty('budget');
      expect(budget).toHaveProperty('actual');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('status');
    });

    test('should show budget available when above target', () => {
      tracker.recordAvailability(true);
      tracker.recordAvailability(true);

      const budget = tracker.getUptimeBudget();
      expect(budget.status).toContain('✅');
    });
  });

  describe('Measurement Pruning', () => {
    test('should prune old measurements', () => {
      tracker.recordErrorRate(0.02);
      
      // Manually set old timestamp
      tracker.measurements.errorRate[0].timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      tracker.pruneOldMeasurements('errorRate', 24 * 60 * 60 * 1000); // 24 hour window

      expect(tracker.measurements.errorRate.length).toBe(0);
    });

    test('should keep recent measurements', () => {
      tracker.recordErrorRate(0.02);

      tracker.pruneOldMeasurements('errorRate', 24 * 60 * 60 * 1000);

      expect(tracker.measurements.errorRate.length).toBe(1);
    });
  });

  describe('SLO Definitions', () => {
    test('should have availability SLO', () => {
      expect(SLOs.AVAILABILITY).toBeDefined();
      expect(SLOs.AVAILABILITY.target).toBe(0.995);
    });

    test('should have error rate SLO', () => {
      expect(SLOs.ERROR_RATE).toBeDefined();
      expect(SLOs.ERROR_RATE.target).toBe(0.05);
    });

    test('should have latency SLO', () => {
      expect(SLOs.LATENCY_P95).toBeDefined();
      expect(SLOs.LATENCY_P95.target).toBe(5000);
    });

    test('should have throughput SLO', () => {
      expect(SLOs.THROUGHPUT).toBeDefined();
      expect(SLOs.THROUGHPUT.target).toBe(10);
    });

    test('should have queue depth SLO', () => {
      expect(SLOs.QUEUE_DEPTH).toBeDefined();
      expect(SLOs.QUEUE_DEPTH.target).toBe(500);
    });
  });
});
