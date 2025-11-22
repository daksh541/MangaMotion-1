// UploadForm.jsx
import React, { useState } from 'react';

export default function UploadForm({ onJobCreated }) {
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!files || files.length === 0) return alert('Select files');
    setUploading(true);
    const fd = new FormData();
    for (let f of files) fd.append('pages', f);
    // optional: options JSON
    fd.append('options', JSON.stringify({ fps: 12, style: 'lite' }));
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.jobId) onJobCreated(json.jobId);
    else alert('Upload failed: ' + JSON.stringify(json));
  }

  return (
    <form onSubmit={submit}>
      <input type="file" multiple accept="image/*,application/pdf" onChange={e => setFiles(e.target.files)} />
      <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Start'}</button>
    </form>
  );
}
