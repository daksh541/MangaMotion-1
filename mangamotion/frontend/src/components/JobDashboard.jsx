import React, { useState, useEffect } from 'react';
import styles from './JobDashboard.module.css';

/**
 * Job Dashboard Component
 * Displays job status, preview thumbnails, and download links
 */
export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, failed, processing

  const userId = localStorage.getItem('userId') || 'anonymous';

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // TODO: Implement backend endpoint to list user's jobs
      // const response = await fetch(`/api/jobs?user_id=${userId}`);
      // const data = await response.json();
      // setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#3b82f6';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'failed':
        return '✕';
      case 'pending':
        return '⧖';
      default:
        return '?';
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Job Dashboard</h1>
        <button onClick={fetchJobs} disabled={loading} className={styles.refreshBtn}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filters}>
        {['all', 'completed', 'processing', 'failed'].map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.jobsList}>
        {filteredJobs.length === 0 ? (
          <div className={styles.empty}>No jobs found</div>
        ) : (
          filteredJobs.map(job => (
            <div
              key={job.id}
              className={styles.jobCard}
              onClick={() => setSelectedJob(job)}
            >
              <div className={styles.jobHeader}>
                <div className={styles.jobId}>{job.id}</div>
                <div
                  className={styles.jobStatus}
                  style={{ backgroundColor: getStatusColor(job.status) }}
                >
                  <span className={styles.statusIcon}>{getStatusIcon(job.status)}</span>
                  {job.status}
                </div>
              </div>

              <div className={styles.jobMeta}>
                <span>{job.fileCount} files</span>
                <span>{(job.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>

              {job.progress !== undefined && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${job.progress}%` }}
                  />
                  <span className={styles.progressText}>{job.progress}%</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

/**
 * Job Detail Modal Component
 */
function JobDetailModal({ job, onClose }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job.thumbnailKey) {
      fetchThumbnail();
    }
    if (job.status === 'completed') {
      fetchDownloadUrl();
    }
  }, [job]);

  const fetchThumbnail = async () => {
    try {
      setLoading(true);
      // TODO: Implement backend endpoint to get thumbnail
      // const response = await fetch(`/api/jobs/${job.id}/thumbnail`);
      // const data = await response.json();
      // setThumbnail(data.url);
    } catch (err) {
      console.error('Failed to fetch thumbnail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadUrl = async () => {
    try {
      // TODO: Implement backend endpoint to get presigned download URL
      // const response = await fetch(`/api/jobs/${job.id}/download`);
      // const data = await response.json();
      // setDownloadUrl(data.url);
    } catch (err) {
      console.error('Failed to fetch download URL:', err);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <h2>Job Details</h2>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Job ID:</span>
            <span className={styles.value}>{job.id}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{job.status}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Files:</span>
            <span className={styles.value}>{job.fileCount}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Size:</span>
            <span className={styles.value}>{(job.totalSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Created:</span>
            <span className={styles.value}>{new Date(job.createdAt).toLocaleString()}</span>
          </div>

          {job.completedAt && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Completed:</span>
              <span className={styles.value}>{new Date(job.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {thumbnail && (
          <div className={styles.preview}>
            <h3>Preview</h3>
            <img src={thumbnail} alt="Thumbnail" className={styles.thumbnail} />
          </div>
        )}

        {job.status === 'completed' && (
          <div className={styles.actions}>
            <button
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={!downloadUrl}
            >
              {downloadUrl ? 'Download Result' : 'Loading...'}
            </button>
          </div>
        )}

        {job.status === 'failed' && job.error && (
          <div className={styles.errorBox}>
            <h3>Error</h3>
            <p>{job.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
