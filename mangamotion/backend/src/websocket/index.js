// backend/src/websocket/index.js
const WebSocketServer = require('./ws-server');
const { logger } = require('../logger');

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(httpServer, options = {}) {
  const wsServer = new WebSocketServer(httpServer, {
    path: '/ws',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    ...options
  });

  logger.info('[WebSocket] Server initialized');

  // Expose stats endpoint
  const app = httpServer._events.request;
  if (app && app.get) {
    app.get('/api/ws/stats', (req, res) => {
      const stats = wsServer.getStats();
      res.json(stats);
    });
  }

  return wsServer;
}

/**
 * Publish job progress update
 */
async function publishJobProgress(wsServer, jobId, userId, status, progress, stage, message) {
  if (wsServer) {
    await wsServer.publishJobUpdate(jobId, userId, status, progress, stage, message);
  }
}

module.exports = {
  WebSocketServer,
  initializeWebSocket,
  publishJobProgress
};
