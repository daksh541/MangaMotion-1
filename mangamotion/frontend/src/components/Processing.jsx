// Processing.jsx
import React, { useEffect, useState } from 'react';

export default function Processing({ jobId, onComplete }) {
  const [status, setStatus] = useState({ progress: 0, status: 'queued', data: null });

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const json = await res.json();
        if (!mounted) return;
        setStatus(json);
        if (json.status === 'completed' || json.progress === 100) {
          onComplete && onComplete(json);
          return;
        }
      } catch (err) {
        console.error('status poll error', err);
      }
      setTimeout(poll, 2000);
    }
    poll();
    return () => { mounted = false; };
  }, [jobId, onComplete]);

  return (
    <div>
      <h3>Processing job {jobId}</h3>
      <div>Stage: {status.status}</div>
      <div>Progress: {status.progress || 0}%</div>
      <progress value={status.progress || 0} max="100" />
      {status.failedReason && <div style={{color:'red'}}>Failed: {status.failedReason}</div>}
    </div>
  );
}
