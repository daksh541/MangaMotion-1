#!/usr/bin/env node

/**
 * Load Test Results Analyzer
 * 
 * Analyzes k6 JSON output and generates a comprehensive report
 * with bottleneck detection and recommendations.
 * 
 * Usage: node analyze-results.js <results-directory>
 */

const fs = require('fs');
const path = require('path');

class LoadTestAnalyzer {
  constructor(resultsDir) {
    this.resultsDir = resultsDir;
    this.results = {};
    this.loadResults();
  }

  /**
   * Load all JSON result files
   */
  loadResults() {
    const files = fs.readdirSync(this.resultsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    jsonFiles.forEach(file => {
      const filePath = path.join(this.resultsDir, file);
      const testName = file.replace('.json', '');
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        this.results[testName] = {
          metrics: {},
          samples: [],
        };

        lines.forEach(line => {
          try {
            const data = JSON.parse(line);
            if (data.type === 'Metric') {
              this.results[testName].metrics[data.metric] = data.data;
            } else if (data.type === 'Point') {
              this.results[testName].samples.push(data.data);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        });
      } catch (e) {
        console.error(`Error loading ${file}: ${e.message}`);
      }
    });
  }

  /**
   * Analyze success rates
   */
  analyzeSuccessRates() {
    const analysis = {};

    Object.entries(this.results).forEach(([testName, data]) => {
      const successMetrics = Object.entries(data.metrics)
        .filter(([name]) => name.includes('success'))
        .map(([name, metric]) => ({
          name,
          value: metric.value,
        }));

      analysis[testName] = {
        successMetrics,
        overallSuccess: successMetrics.length > 0 
          ? successMetrics.reduce((sum, m) => sum + m.value, 0) / successMetrics.length
          : null,
      };
    });

    return analysis;
  }

  /**
   * Analyze response times
   */
  analyzeResponseTimes() {
    const analysis = {};

    Object.entries(this.results).forEach(([testName, data]) => {
      const durationMetrics = Object.entries(data.metrics)
        .filter(([name]) => name.includes('duration') || name.includes('time'))
        .map(([name, metric]) => ({
          name,
          value: metric.value,
        }));

      analysis[testName] = {
        durationMetrics,
        avgDuration: durationMetrics.length > 0
          ? durationMetrics.reduce((sum, m) => sum + m.value, 0) / durationMetrics.length
          : null,
      };
    });

    return analysis;
  }

  /**
   * Analyze error rates
   */
  analyzeErrorRates() {
    const analysis = {};

    Object.entries(this.results).forEach(([testName, data]) => {
      const errorMetrics = Object.entries(data.metrics)
        .filter(([name]) => name.includes('error') || name.includes('fail'))
        .map(([name, metric]) => ({
          name,
          value: metric.value,
        }));

      analysis[testName] = {
        errorMetrics,
        totalErrors: errorMetrics.reduce((sum, m) => sum + m.value, 0),
      };
    });

    return analysis;
  }

  /**
   * Detect bottlenecks
   */
  detectBottlenecks() {
    const bottlenecks = [];
    const successAnalysis = this.analyzeSuccessRates();
    const responseAnalysis = this.analyzeResponseTimes();
    const errorAnalysis = this.analyzeErrorRates();

    // Check success rates
    Object.entries(successAnalysis).forEach(([testName, data]) => {
      if (data.overallSuccess !== null && data.overallSuccess < 0.95) {
        bottlenecks.push({
          severity: 'HIGH',
          test: testName,
          type: 'LOW_SUCCESS_RATE',
          message: `Success rate is ${(data.overallSuccess * 100).toFixed(2)}% (threshold: 95%)`,
          recommendation: 'Check API logs and database connections',
        });
      }
    });

    // Check response times
    Object.entries(responseAnalysis).forEach(([testName, data]) => {
      if (data.avgDuration !== null && data.avgDuration > 5000) {
        bottlenecks.push({
          severity: 'HIGH',
          test: testName,
          type: 'SLOW_RESPONSE_TIME',
          message: `Average response time is ${data.avgDuration.toFixed(0)}ms (threshold: 5000ms)`,
          recommendation: 'Check database queries and API performance',
        });
      }
    });

    // Check error rates
    Object.entries(errorAnalysis).forEach(([testName, data]) => {
      if (data.totalErrors > 100) {
        bottlenecks.push({
          severity: 'CRITICAL',
          test: testName,
          type: 'HIGH_ERROR_RATE',
          message: `Total errors: ${data.totalErrors}`,
          recommendation: 'Check logs for error details',
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const bottlenecks = this.detectBottlenecks();
    const recommendations = [];

    // Analyze bottleneck patterns
    const bottleneckTypes = {};
    bottlenecks.forEach(b => {
      bottleneckTypes[b.type] = (bottleneckTypes[b.type] || 0) + 1;
    });

    // Generate specific recommendations
    if (bottleneckTypes['LOW_SUCCESS_RATE']) {
      recommendations.push({
        priority: 'HIGH',
        category: 'API Performance',
        action: 'Investigate API errors and database issues',
        steps: [
          'Check API logs: docker logs mangamotion-api',
          'Check database connections: psql -c "SELECT count(*) FROM pg_stat_activity;"',
          'Check rate limiting: Increase RATE_LIMIT_JOBS_PER_MINUTE if needed',
          'Monitor MinIO: curl http://localhost:9000/minio/health/live',
        ],
      });
    }

    if (bottleneckTypes['SLOW_RESPONSE_TIME']) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Response Time',
        action: 'Optimize slow queries and API endpoints',
        steps: [
          'Identify slow queries: psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"',
          'Add database indexes on frequently queried columns',
          'Implement caching for status checks',
          'Scale API horizontally if CPU is bottleneck',
        ],
      });
    }

    if (bottleneckTypes['HIGH_ERROR_RATE']) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Error Handling',
        action: 'Investigate and fix critical errors',
        steps: [
          'Review error logs: docker logs mangamotion-api | grep -i error',
          'Check worker logs: docker logs mangamotion-worker | grep -i error',
          'Monitor Redis: redis-cli INFO stats',
          'Check disk space and memory availability',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const successAnalysis = this.analyzeSuccessRates();
    const responseAnalysis = this.analyzeResponseTimes();
    const errorAnalysis = this.analyzeErrorRates();
    const bottlenecks = this.detectBottlenecks();
    const recommendations = this.generateRecommendations();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .section { margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
    .metric-label { font-size: 12px; color: #666; }
    .success { border-left-color: #28a745; }
    .success .metric-value { color: #28a745; }
    .warning { border-left-color: #ffc107; }
    .warning .metric-value { color: #ffc107; }
    .error { border-left-color: #dc3545; }
    .error .metric-value { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f9f9f9; font-weight: bold; }
    .bottleneck { padding: 15px; margin: 10px 0; border-radius: 4px; }
    .bottleneck.critical { background: #f8d7da; border-left: 4px solid #dc3545; }
    .bottleneck.high { background: #fff3cd; border-left: 4px solid #ffc107; }
    .recommendation { padding: 15px; margin: 10px 0; background: #d1ecf1; border-left: 4px solid #17a2b8; border-radius: 4px; }
    .recommendation h4 { margin: 0 0 10px 0; }
    .recommendation ul { margin: 10px 0; padding-left: 20px; }
    .recommendation li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Load Test Results Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    <h2>Success Rates</h2>
    <div class="section">
      ${Object.entries(successAnalysis).map(([test, data]) => {
        const rate = data.overallSuccess ? (data.overallSuccess * 100).toFixed(2) : 'N/A';
        const className = data.overallSuccess >= 0.95 ? 'success' : data.overallSuccess >= 0.90 ? 'warning' : 'error';
        return `
          <div class="metric ${className}">
            <div class="metric-value">${rate}%</div>
            <div class="metric-label">${test}</div>
          </div>
        `;
      }).join('')}
    </div>

    <h2>Response Times (Average)</h2>
    <div class="section">
      ${Object.entries(responseAnalysis).map(([test, data]) => {
        const duration = data.avgDuration ? data.avgDuration.toFixed(0) : 'N/A';
        const className = data.avgDuration <= 1000 ? 'success' : data.avgDuration <= 5000 ? 'warning' : 'error';
        return `
          <div class="metric ${className}">
            <div class="metric-value">${duration}ms</div>
            <div class="metric-label">${test}</div>
          </div>
        `;
      }).join('')}
    </div>

    <h2>Errors</h2>
    <div class="section">
      ${Object.entries(errorAnalysis).map(([test, data]) => {
        const errors = data.totalErrors;
        const className = errors === 0 ? 'success' : errors < 100 ? 'warning' : 'error';
        return `
          <div class="metric ${className}">
            <div class="metric-value">${errors}</div>
            <div class="metric-label">${test}</div>
          </div>
        `;
      }).join('')}
    </div>

    ${bottlenecks.length > 0 ? `
      <h2>⚠️ Bottlenecks Detected</h2>
      <div class="section">
        ${bottlenecks.map(b => `
          <div class="bottleneck ${b.severity.toLowerCase()}">
            <strong>[${b.severity}] ${b.type}</strong> (${b.test})<br>
            ${b.message}<br>
            <em>Recommendation: ${b.recommendation}</em>
          </div>
        `).join('')}
      </div>
    ` : `
      <h2>✅ No Bottlenecks Detected</h2>
      <p>System performance is within acceptable parameters.</p>
    `}

    ${recommendations.length > 0 ? `
      <h2>💡 Recommendations</h2>
      <div class="section">
        ${recommendations.map(r => `
          <div class="recommendation">
            <h4>[${r.priority}] ${r.category}: ${r.action}</h4>
            <ul>
              ${r.steps.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <h2>Acceptance Criteria</h2>
    <table>
      <tr>
        <th>Criterion</th>
        <th>Target</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Upload Success Rate</td>
        <td>&gt; 95%</td>
        <td>${successAnalysis['concurrent-uploads']?.overallSuccess >= 0.95 ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
      <tr>
        <td>Job Failure Rate</td>
        <td>&lt; 5%</td>
        <td>${successAnalysis['worker-processing']?.overallSuccess >= 0.95 ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
      <tr>
        <td>S3 Upload Success Rate</td>
        <td>&gt; 95%</td>
        <td>${successAnalysis['presign-uploads']?.overallSuccess >= 0.95 ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
      <tr>
        <td>No Bottlenecks</td>
        <td>None</td>
        <td>${bottlenecks.length === 0 ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
    </table>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Print console report
   */
  printReport() {
    const successAnalysis = this.analyzeSuccessRates();
    const responseAnalysis = this.analyzeResponseTimes();
    const errorAnalysis = this.analyzeErrorRates();
    const bottlenecks = this.detectBottlenecks();
    const recommendations = this.generateRecommendations();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  LOAD TEST RESULTS REPORT                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Success Rates:');
    console.log('─'.repeat(60));
    Object.entries(successAnalysis).forEach(([test, data]) => {
      const rate = data.overallSuccess ? (data.overallSuccess * 100).toFixed(2) : 'N/A';
      const icon = data.overallSuccess >= 0.95 ? '✅' : data.overallSuccess >= 0.90 ? '⚠️' : '❌';
      console.log(`${icon} ${test}: ${rate}%`);
    });

    console.log('\n⏱️  Response Times (Average):');
    console.log('─'.repeat(60));
    Object.entries(responseAnalysis).forEach(([test, data]) => {
      const duration = data.avgDuration ? data.avgDuration.toFixed(0) : 'N/A';
      const icon = data.avgDuration <= 1000 ? '✅' : data.avgDuration <= 5000 ? '⚠️' : '❌';
      console.log(`${icon} ${test}: ${duration}ms`);
    });

    console.log('\n❌ Errors:');
    console.log('─'.repeat(60));
    Object.entries(errorAnalysis).forEach(([test, data]) => {
      const errors = data.totalErrors;
      const icon = errors === 0 ? '✅' : errors < 100 ? '⚠️' : '❌';
      console.log(`${icon} ${test}: ${errors} errors`);
    });

    if (bottlenecks.length > 0) {
      console.log('\n⚠️  Bottlenecks Detected:');
      console.log('─'.repeat(60));
      bottlenecks.forEach(b => {
        const icon = b.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`${icon} [${b.severity}] ${b.type} (${b.test})`);
        console.log(`   ${b.message}`);
        console.log(`   → ${b.recommendation}`);
      });
    } else {
      console.log('\n✅ No Bottlenecks Detected');
    }

    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('─'.repeat(60));
      recommendations.forEach(r => {
        console.log(`\n[${r.priority}] ${r.category}`);
        console.log(`${r.action}`);
        r.steps.forEach(step => console.log(`  • ${step}`));
      });
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  /**
   * Save HTML report
   */
  saveHTMLReport(filename = 'report.html') {
    const html = this.generateHTMLReport();
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, html);
    console.log(`✅ HTML report saved to: ${filepath}`);
  }
}

// Main execution
if (require.main === module) {
  const resultsDir = process.argv[2];

  if (!resultsDir) {
    console.error('Usage: node analyze-results.js <results-directory>');
    process.exit(1);
  }

  if (!fs.existsSync(resultsDir)) {
    console.error(`Error: Directory not found: ${resultsDir}`);
    process.exit(1);
  }

  const analyzer = new LoadTestAnalyzer(resultsDir);
  analyzer.printReport();
  analyzer.saveHTMLReport();
}

module.exports = LoadTestAnalyzer;
