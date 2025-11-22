self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

function jsonResponse(obj, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const JOBS = new Map();

self.addEventListener('fetch', async (event) => {
  const url = new URL(event.request.url);
  // Only intercept our API calls
  if (!url.pathname.startsWith('/api/')) return;

  event.respondWith(handleApi(event));
});

async function handleApi(event) {
  const url = new URL(event.request.url);
  const path = url.pathname;
  try {
    if (path === '/api/detect-panels' && event.request.method === 'POST') {
      const body = await event.request.json();
      // Return three mock panels with simple bboxes and placeholder thumbs
      const panels = [
        { id: 'p1', bbox: [0.05, 0.10, 0.40, 0.35], thumbnailUrl: '/public/images/logo.svg', confidence: 0.92 },
        { id: 'p2', bbox: [0.55, 0.10, 0.40, 0.35], thumbnailUrl: '/public/images/logo.svg', confidence: 0.90 },
        { id: 'p3', bbox: [0.05, 0.55, 0.90, 0.35], thumbnailUrl: '/public/images/logo.svg', confidence: 0.95 },
      ];
      return jsonResponse(panels);
    }
    if (path === '/api/analyze-emotion' && event.request.method === 'POST') {
      const body = await event.request.json();
      const text = (body.dialog || '').toLowerCase();
      let emotion = 'neutral';
      let intensity = 0.4;
      if (text.includes('!') || /[A-Z]{3,}/.test(body.dialog || '')) { emotion = 'excited'; intensity = 0.8; }
      if (text.includes('...') || text.includes('sigh')) { emotion = 'sad'; intensity = 0.6; }
      const results = (body.panels || []).map(p => ({ panelId: p.panelId, emotion, intensity }));
      return jsonResponse({ results });
    }
    if (path === '/api/generate-voice' && event.request.method === 'POST') {
      const body = await event.request.json();
      // Return a short placeholder audio (reuse demo mp4 audio is not ideal, but okay for mock)
      const audioUrl = '/resources/hero-demo.mp4';
      const costEstimate = 0.2; // credits
      const durationSec = Math.min(5, Math.max(1, Math.ceil((body.text || '').length / 12)));
      return jsonResponse({ audioUrl, durationSec, costEstimate });
    }
    if (path === '/api/start-render' && event.request.method === 'POST') {
      const body = await event.request.json();
      const jobId = 'job_' + Date.now();
      JOBS.set(jobId, { progress: 0, start: Date.now(), quality: (body.settings && body.settings.quality) || '720p' });
      // Simulate progress
      const tick = () => {
        const j = JOBS.get(jobId);
        if (!j) return;
        j.progress = Math.min(100, j.progress + Math.floor(Math.random() * 20) + 5);
        if (j.progress < 100) setTimeout(tick, 400);
      };
      setTimeout(tick, 400);
      return jsonResponse({ jobId });
    }
    if (path === '/api/render-status' && event.request.method === 'GET') {
      const jobId = new URL(event.request.url).searchParams.get('jobId');
      const j = JOBS.get(jobId);
      if (!j) return jsonResponse({ status: 'error', progress: 0 }, 404);
      const status = j.progress >= 100 ? 'success' : 'running';
      const etaSec = j.progress >= 100 ? 0 : Math.ceil((100 - j.progress) / 20) * 1;
      const downloadUrl = status === 'success' ? '/resources/hero-demo.mp4' : undefined;
      return jsonResponse({ status, progress: j.progress, etaSec, downloadUrl });
    }
    if (path === '/api/upload-init' && event.request.method === 'POST') {
      const body = await event.request.json();
      // Mock presigned URL flow by returning a pretend s3 key and public URL
      const s3Key = 'originals/' + Date.now() + '_' + (body.filename || 'file');
      return jsonResponse({ uploadUrl: '/dev/null', fileId: 'f_' + Date.now(), s3Key, publicUrl: '/'+s3Key });
    }
    return jsonResponse({ error: 'Not found' }, 404);
  } catch (e) {
    return jsonResponse({ error: 'Server error', message: String(e) }, 500);
  }
}
