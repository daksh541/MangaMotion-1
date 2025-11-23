// frontend/src/components/UploadEnqueue.jsx
import React, { useState, useEffect } from 'react';

export default function UploadEnqueue() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [statusProgress, setStatusProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);

  const onFile = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const upload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const form = new FormData();
    form.append('file', file);
    if (prompt) {
      form.append('prompt', prompt);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        setLoading(false);
        if (xhr.status === 202) {
          try {
            const data = JSON.parse(xhr.responseText);
            setJobId(data.jobId);
            localStorage.setItem('lastJobId', data.jobId);
            setPollingActive(true);
            setJobStatus('queued');
            setStatusProgress(0);
          } catch (e) {
            setError('Failed to parse response');
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setError(data.message || data.error || 'Upload failed');
          } catch (e) {
            setError(`Upload failed: ${xhr.status}`);
          }
        }
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setError('Network error');
    };

    xhr.send(form);
  };

  // Poll job status
  useEffect(() => {
    if (!pollingActive || !jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJobStatus(data.status);
          setStatusProgress(data.progress);

          if (data.status === 'completed' || data.status === 'failed') {
            setPollingActive(false);
            if (data.resultUrl) {
              localStorage.setItem(`result_${jobId}`, data.resultUrl);
            }
          }
        } else {
          console.error('Status check failed:', res.status);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [pollingActive, jobId]);

  const handleReset = () => {
    setFile(null);
    setPrompt('');
    setJobId(null);
    setJobStatus(null);
    setUploadProgress(0);
    setStatusProgress(0);
    setError(null);
    setPollingActive(false);
  };

  const downloadResult = () => {
    const resultUrl = localStorage.getItem(`result_${jobId}`);
    if (resultUrl) {
      window.open(resultUrl, '_blank');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>MangaMotion Upload</h1>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!jobId ? (
          <div style={styles.uploadSection}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Select File</label>
              <input
                type="file"
                onChange={onFile}
                accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
                style={styles.fileInput}
                disabled={loading}
              />
              {file && (
                <div style={styles.fileInfo}>
                  <strong>Selected:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Prompt (optional)</label>
              <textarea
                placeholder="e.g., make this anime-style, add subtle camera parallax, 24fps"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={styles.textarea}
                disabled={loading}
              />
            </div>

            <button
              onClick={upload}
              disabled={!file || loading}
              style={{
                ...styles.button,
                opacity: !file || loading ? 0.5 : 1,
                cursor: !file || loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={styles.progressContainer}>
                <div style={styles.progressLabel}>Upload Progress: {uploadProgress}%</div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${uploadProgress}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.statusSection}>
            <div style={styles.statusBox}>
              <h2 style={styles.statusTitle}>Job Status</h2>
              <div style={styles.statusItem}>
                <strong>Job ID:</strong>
                <code style={styles.code}>{jobId}</code>
              </div>
              <div style={styles.statusItem}>
                <strong>Status:</strong>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: jobStatus === 'completed' ? '#10B981' : jobStatus === 'failed' ? '#EF4444' : '#3B82F6'
                }}>
                  {jobStatus}
                </span>
              </div>
              <div style={styles.statusItem}>
                <strong>Progress:</strong> {statusProgress}%
              </div>

              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${statusProgress}%`
                    }}
                  />
                </div>
              </div>

              {jobStatus === 'completed' && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={downloadResult}
                    style={{...styles.button, backgroundColor: '#10B981'}}
                  >
                    Download Result
                  </button>
                  <button
                    onClick={handleReset}
                    style={{...styles.button, backgroundColor: '#6B7280'}}
                  >
                    Upload Another
                  </button>
                </div>
              )}

              {jobStatus === 'failed' && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={handleReset}
                    style={{...styles.button, backgroundColor: '#6B7280'}}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {(jobStatus === 'queued' || jobStatus === 'processing') && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={handleReset}
                    style={{...styles.button, backgroundColor: '#6B7280'}}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0F1419',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    backgroundColor: '#1a1f2e',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(168, 85, 247, 0.2)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent'
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  fileInput: {
    padding: '12px',
    backgroundColor: '#0F1419',
    border: '2px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    cursor: 'pointer',
    fontSize: '14px'
  },
  textarea: {
    padding: '12px',
    backgroundColor: '#0F1419',
    border: '2px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '14px',
    minHeight: '100px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  fileInfo: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '4px'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#a855f7',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressLabel: {
    fontSize: '13px',
    color: '#9ca3af'
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    transition: 'width 0.3s ease'
  },
  statusSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  statusBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  statusTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e5e7eb',
    margin: '0 0 8px 0'
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#d1d5db'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  code: {
    backgroundColor: '#0F1419',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#a855f7',
    wordBreak: 'break-all'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px'
  }
};
