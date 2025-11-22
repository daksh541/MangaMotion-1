import React, { useState, useEffect } from 'react';
import styles from './BillingDashboard.module.css';

/**
 * Billing Dashboard Component
 * Displays per-user usage metrics and estimated costs
 */
export default function BillingDashboard() {
  const [summary, setSummary] = useState(null);
  const [dailyUsage, setDailyUsage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days

  const userId = localStorage.getItem('userId') || 'anonymous';

  useEffect(() => {
    fetchBillingData();
  }, [dateRange]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch billing summary
      const summaryRes = await fetch(`/api/billing/summary?user_id=${userId}`);
      if (!summaryRes.ok) throw new Error('Failed to fetch billing summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Fetch daily usage
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const usageRes = await fetch(
        `/api/billing/daily-usage?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      );
      if (!usageRes.ok) throw new Error('Failed to fetch daily usage');
      const usageData = await usageRes.json();
      setDailyUsage(usageData.daily_usage || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSeconds = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Billing & Usage</h1>
        <button onClick={fetchBillingData} disabled={loading} className={styles.refreshBtn}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Total Bytes Processed</div>
            <div className={styles.cardValue}>{formatBytes(summary.bytes_processed)}</div>
            <div className={styles.cardSubtext}>{summary.bytes_processed_gb} GB</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Compute Time</div>
            <div className={styles.cardValue}>{formatSeconds(summary.compute_seconds)}</div>
            <div className={styles.cardSubtext}>{summary.compute_hours} hours</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Jobs Processed</div>
            <div className={styles.cardValue}>{summary.job_count}</div>
            <div className={styles.cardSubtext}>
              {summary.jobs_completed} completed, {summary.jobs_failed} failed
            </div>
          </div>

          <div className={`${styles.card} ${styles.costCard}`}>
            <div className={styles.cardLabel}>Estimated Cost</div>
            <div className={styles.cardValue}>${summary.estimated_cost.toFixed(2)}</div>
            <div className={styles.cardSubtext}>Based on current rates</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Daily Usage</h2>
          <div className={styles.dateRangeSelector}>
            {['7', '30', '90'].map(range => (
              <button
                key={range}
                className={`${styles.rangeBtn} ${dateRange === range ? styles.active : ''}`}
                onClick={() => setDateRange(range)}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>

        <div className={styles.usageTable}>
          <div className={styles.tableHeader}>
            <div className={styles.tableCell}>Date</div>
            <div className={styles.tableCell}>Bytes</div>
            <div className={styles.tableCell}>Compute</div>
            <div className={styles.tableCell}>Jobs</div>
          </div>

          {dailyUsage.length === 0 ? (
            <div className={styles.empty}>No usage data available</div>
          ) : (
            dailyUsage.map(day => (
              <div key={day.date} className={styles.tableRow}>
                <div className={styles.tableCell}>{new Date(day.date).toLocaleDateString()}</div>
                <div className={styles.tableCell}>{formatBytes(day.bytes_processed)}</div>
                <div className={styles.tableCell}>{formatSeconds(day.compute_seconds)}</div>
                <div className={styles.tableCell}>
                  <span className={styles.jobBadge}>{day.job_count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2>Pricing</h2>
        <div className={styles.pricingInfo}>
          <div className={styles.pricingRow}>
            <span>Data Processing</span>
            <span>$0.001 per GB</span>
          </div>
          <div className={styles.pricingRow}>
            <span>Compute Time</span>
            <span>$0.0001 per second</span>
          </div>
          <div className={styles.pricingNote}>
            Pricing is subject to change. Contact support for volume discounts.
          </div>
        </div>
      </div>
    </div>
  );
}
