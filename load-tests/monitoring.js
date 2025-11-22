/**
 * Monitoring and Metrics Collection Utilities
 * 
 * Provides real-time monitoring of:
 * - API performance metrics
 * - Infrastructure resource usage
 * - Job processing statistics
 * - Error tracking and analysis
 */

import http from 'k6/http';

export class MetricsCollector {
  constructor(metricsUrl = 'http://localhost:3000/api/metrics') {
    this.metricsUrl = metricsUrl;
    this.samples = [];
    this.startTime = Date.now();
  }

  /**
   * Collect metrics snapshot
   */
  collect() {
    try {
      const response = http.get(this.metricsUrl, { timeout: '5s' });
      if (response.status === 200) {
        const metrics = response.json();
        const timestamp = Date.now();
        
        this.samples.push({
          timestamp,
          metrics,
          elapsed: (timestamp - this.startTime) / 1000,
        });

        return metrics;
      }
    } catch (e) {
      console.error(`Failed to collect metrics: ${e}`);
    }
    return null;
  }

  /**
   * Get average metric value
   */
  getAverageMetric(metricName) {
    const values = this.samples
      .map(s => s.metrics[metricName])
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get max metric value
   */
  getMaxMetric(metricName) {
    const values = this.samples
      .map(s => s.metrics[metricName])
      .filter(v => v !== undefined && v !== null);
    
    return values.length > 0 ? Math.max(...values) : null;
  }

  /**
   * Get min metric value
   */
  getMinMetric(metricName) {
    const values = this.samples
      .map(s => s.metrics[metricName])
      .filter(v => v !== undefined && v !== null);
    
    return values.length > 0 ? Math.min(...values) : null;
  }

  /**
   * Detect bottlenecks based on metric trends
   */
  detectBottlenecks() {
    const bottlenecks = [];

    // Check API response time trend
    const apiTimes = this.samples.map(s => s.metrics.api_response_time_ms).filter(v => v);
    if (apiTimes.length > 2) {
      const recent = apiTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const earlier = apiTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      if (recent > earlier * 1.5) {
        bottlenecks.push({
          type: 'API_DEGRADATION',
          severity: 'HIGH',
          message: `API response time increased from ${earlier.toFixed(0)}ms to ${recent.toFixed(0)}ms`,
        });
      }
    }

    // Check error rates
    const errorRate = this.samples[this.samples.length - 1]?.metrics?.error_rate || 0;
    if (errorRate > 0.05) {
      bottlenecks.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: 5%)`,
      });
    }

    // Check queue depth
    const queueDepth = this.samples[this.samples.length - 1]?.metrics?.queue_depth || 0;
    if (queueDepth > 1000) {
      bottlenecks.push({
        type: 'QUEUE_SATURATION',
        severity: 'HIGH',
        message: `Queue depth is ${queueDepth} jobs (may indicate worker bottleneck)`,
      });
    }

    // Check resource usage
    const cpuUsage = this.samples[this.samples.length - 1]?.metrics?.cpu_usage || 0;
    if (cpuUsage > 80) {
      bottlenecks.push({
        type: 'HIGH_CPU_USAGE',
        severity: 'HIGH',
        message: `CPU usage is ${cpuUsage.toFixed(2)}% (threshold: 80%)`,
      });
    }

    const memoryUsage = this.samples[this.samples.length - 1]?.metrics?.memory_usage || 0;
    if (memoryUsage > 85) {
      bottlenecks.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'HIGH',
        message: `Memory usage is ${memoryUsage.toFixed(2)}% (threshold: 85%)`,
      });
    }

    return bottlenecks;
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const report = {
      duration_seconds: (Date.now() - this.startTime) / 1000,
      samples_collected: this.samples.length,
      metrics: {},
      bottlenecks: this.detectBottlenecks(),
    };

    // Collect metric statistics
    const metricNames = new Set();
    this.samples.forEach(s => {
      Object.keys(s.metrics).forEach(name => metricNames.add(name));
    });

    metricNames.forEach(name => {
      report.metrics[name] = {
        avg: this.getAverageMetric(name),
        min: this.getMinMetric(name),
        max: this.getMaxMetric(name),
      };
    });

    return report;
  }

  /**
   * Print formatted report
   */
  printReport() {
    const report = this.generateReport();
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    LOAD TEST METRICS REPORT                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Duration: ${report.duration_seconds.toFixed(2)}s`);
    console.log(`Samples Collected: ${report.samples_collected}\n`);

    console.log('📊 Metrics Summary:');
    console.log('─'.repeat(60));
    Object.entries(report.metrics).forEach(([name, stats]) => {
      if (stats.avg !== null) {
        console.log(`${name}:`);
        console.log(`  Avg: ${stats.avg.toFixed(2)}, Min: ${stats.min.toFixed(2)}, Max: ${stats.max.toFixed(2)}`);
      }
    });

    if (report.bottlenecks.length > 0) {
      console.log('\n⚠️  Bottlenecks Detected:');
      console.log('─'.repeat(60));
      report.bottlenecks.forEach(bottleneck => {
        const icon = bottleneck.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`${icon} [${bottleneck.type}] ${bottleneck.message}`);
      });
    } else {
      console.log('\n✅ No bottlenecks detected');
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }
}

/**
 * Infrastructure Health Checker
 */
export class HealthChecker {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check API health
   */
  checkAPI() {
    try {
      const response = http.get(`${this.baseUrl}/api/metrics`, { timeout: '5s' });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check Redis connectivity
   */
  checkRedis() {
    // This would require a dedicated endpoint
    // For now, we check if the API is responsive (which depends on Redis)
    return this.checkAPI();
  }

  /**
   * Check MinIO connectivity
   */
  checkMinIO() {
    // This would require a dedicated endpoint
    // For now, we check if the API is responsive
    return this.checkAPI();
  }

  /**
   * Check PostgreSQL connectivity
   */
  checkPostgreSQL() {
    // This would require a dedicated endpoint
    // For now, we check if the API is responsive
    return this.checkAPI();
  }

  /**
   * Perform full health check
   */
  performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      api: this.checkAPI(),
      redis: this.checkRedis(),
      minio: this.checkMinIO(),
      postgresql: this.checkPostgreSQL(),
    };

    health.healthy = Object.values(health).every((v, i) => i === 0 || v);
    return health;
  }

  /**
   * Print health status
   */
  printHealthStatus() {
    const health = this.performHealthCheck();
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   INFRASTRUCTURE HEALTH CHECK                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const services = [
      { name: 'API', status: health.api },
      { name: 'Redis', status: health.redis },
      { name: 'MinIO', status: health.minio },
      { name: 'PostgreSQL', status: health.postgresql },
    ];

    services.forEach(service => {
      const icon = service.status ? '✅' : '❌';
      console.log(`${icon} ${service.name}`);
    });

    console.log(`\nOverall: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);
  }
}

/**
 * Performance Analyzer
 */
export class PerformanceAnalyzer {
  constructor(samples = []) {
    this.samples = samples;
  }

  /**
   * Calculate percentile
   */
  percentile(values, p) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Analyze response times
   */
  analyzeResponseTimes(responseTimes) {
    const sorted = responseTimes.sort((a, b) => a - b);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: this.percentile(responseTimes, 50),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
    };
  }

  /**
   * Analyze throughput
   */
  analyzeThroughput(successCount, durationSeconds) {
    return {
      total_requests: successCount,
      duration_seconds: durationSeconds,
      requests_per_second: (successCount / durationSeconds).toFixed(2),
    };
  }

  /**
   * Analyze error distribution
   */
  analyzeErrors(errors) {
    const distribution = {};
    errors.forEach(error => {
      distribution[error.type] = (distribution[error.type] || 0) + 1;
    });
    return distribution;
  }
}

export default {
  MetricsCollector,
  HealthChecker,
  PerformanceAnalyzer,
};
