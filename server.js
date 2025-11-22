// server.js - MangaMotion AI Production Server
// Save this file as: server.js in your project root

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/resources', express.static(path.join(__dirname, 'resources')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/mangamotion', express.static(path.join(__dirname, 'mangamotion')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// API ENDPOINTS
// ============================================

// Presigned URL for file upload
app.post('/api/upload/presigned-url', (req, res) => {
  const { filename, fileType } = req.body;
  res.json({
    url: `https://mangamotion-uploads.s3.amazonaws.com`,
    key: `uploads/${Date.now()}-${filename}`,
    fields: { 'Content-Type': fileType },
    fileUrl: `https://mangamotion-uploads.s3.amazonaws.com/uploads/${Date.now()}-${filename}`
  });
});

// File upload endpoint
app.post('/api/upload', (req, res) => {
  const jobId = `job_${Date.now()}`;
  res.json({
    jobId,
    status: 'queued',
    message: 'Upload successful'
  });
});

// Job status tracking
const jobProgress = {};
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  if (!jobProgress[jobId]) jobProgress[jobId] = 0;
  jobProgress[jobId] = Math.min(jobProgress[jobId] + Math.floor(Math.random() * 15) + 5, 100);
  
  res.json({
    jobId,
    status: jobProgress[jobId] >= 100 ? 'completed' : 'processing',
    progress: jobProgress[jobId],
    data: jobProgress[jobId] >= 100 ? { outputUrl: '/resources/demo-output.mp4' } : null
  });
});

// Panel detection
app.post('/api/detect-panels', (req, res) => {
  setTimeout(() => {
    res.json([
      { id: 1, x: 10, y: 10, width: 40, height: 35, order: 1, confidence: 0.98 },
      { id: 2, x: 55, y: 10, width: 40, height: 35, order: 2, confidence: 0.95 },
      { id: 3, x: 10, y: 55, width: 85, height: 40, order: 3, confidence: 0.97 }
    ]);
  }, 800);
});

// Voice generation
app.post('/api/generate-voice', (req, res) => {
  const { text, voiceId, emotion } = req.body;
  setTimeout(() => {
    res.json({
      audioUrl: '/resources/demo-voice.mp3',
      duration: Math.floor(text.length / 10),
      costEstimate: 0.05
    });
  }, 1500);
});

// Start render
app.post('/api/start-render', (req, res) => {
  const { settings } = req.body;
  const jobId = `render_${Date.now()}`;
  res.json({
    jobId,
    status: 'queued',
    estimatedTime: settings.quality === '4K' ? 120 : settings.quality === '1080p' ? 60 : 30
  });
});

// Render status
const renderProgress = {};
app.get('/api/render-status', (req, res) => {
  const { jobId } = req.query;
  if (!renderProgress[jobId]) renderProgress[jobId] = 0;
  renderProgress[jobId] = Math.min(renderProgress[jobId] + Math.floor(Math.random() * 8) + 2, 100);
  
  res.json({
    jobId,
    status: renderProgress[jobId] >= 100 ? 'success' : 'processing',
    progress: renderProgress[jobId],
    etaSec: Math.floor((100 - renderProgress[jobId]) / 3),
    downloadUrl: renderProgress[jobId] >= 100 ? '/resources/demo-output.mp4' : null
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// ============================================
// HTML ROUTES
// ============================================

const pages = [
  { route: '/', file: 'index.html' },
  { route: '/signup', file: 'signup.html' },
  { route: '/login', file: 'login.html' },
  { route: '/dashboard', file: 'dashboard.html' },
  { route: '/upload', file: 'upload.html' },
  { route: '/detection', file: 'detection.html' },
  { route: '/editor', file: 'editor.html' },
  { route: '/export', file: 'export.html' },
  { route: '/pricing', file: 'pricing.html' }
];

pages.forEach(page => {
  app.get(page.route, (req, res) => {
    const filePath = path.join(__dirname, page.file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`File not found: ${page.file}`);
    }
  });
  
  if (page.route !== '/') {
    app.get(`${page.route}.html`, (req, res) => res.redirect(page.route));
  }
});

// Serve main.js
app.get('/main.js', (req, res) => {
  const filePath = path.join(__dirname, 'main.js');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('// main.js not found');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.clear();
  console.log('\n' + '='.repeat(60));
  console.log('  🎬 MangaMotion AI - Server Running');
  console.log('='.repeat(60));
  console.log(`\n✓ Port: ${PORT}`);
  console.log(`✓ Main URL: http://localhost:${PORT}`);
  console.log('\n📄 Pages:');
  pages.forEach(p => console.log(`   ${p.route.padEnd(15)} → http://localhost:${PORT}${p.route}`));
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Ready! Open http://localhost:' + PORT + ' in your browser');
  console.log('='.repeat(60));
  console.log('\n💡 Press Ctrl+C to stop\n');
});