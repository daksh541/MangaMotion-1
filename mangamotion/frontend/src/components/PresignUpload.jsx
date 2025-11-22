// PresignUpload.jsx
import React, { useState } from 'react';

export default function PresignUpload({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!files.length) return alert('no files');
    setUploading(true);
    try {
      const uploadedKeys = [];
      for (let f of files) {
        // get presign
        const res = await fetch('/api/presign', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            filename: f.name, 
            contentType: f.type || 'application/octet-stream',
            fileSizeBytes: f.size
          })
        });
        const presign = await res.json();
        if (!presign.url) throw new Error('presign failed: ' + JSON.stringify(presign));
        // upload to S3
        const put = await fetch(presign.url, { method: 'PUT', body: f, headers: { 'Content-Type': f.type } });
        if (!put.ok) throw new Error('S3 upload failed');
        uploadedKeys.push(presign.key);
      }
      // start processing by sending S3 keys to /api/upload (or separate start endpoint)
      const start = await fetch('/api/upload', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ s3Keys: uploadedKeys, options: { fps: 12 } })
      });
      const json = await start.json();
      setUploading(false);
      onUploaded(json.jobId);
    } catch (err) {
      setUploading(false);
      alert('Upload failed: ' + err.message);
    }
  }

  return (
    <div>
      <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading to S3...' : 'Upload to S3 & Start'}
      </button>
    </div>
  );
}
