// backend/src/websocket/ws-server.js
const WebSocket = require('ws');
const Redis = require('ioredis');
const { verifyAccessToken } = require('../auth/auth');
const { logger } = require('../logger');

/**
 * WebSocket Server with Redis Pub/Sub
 * 
 * Provides real-time job progress updates to connected clients
 * Scales horizontally using Redis pub/sub
 */
class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.httpServer = httpServer;
    this.options = {
      path: options.path || '/ws',
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      ...options
    };

    // WebSocket server
    this.wss = new WebSocket.Server({
      server: httpServer,
      path: this.options.path
    });

    // Redis clients
    this.redisPub = new Redis(this.options.redisUrl);
    this.redisSub = new Redis(this.options.redisUrl);

    // Connected clients: Map<userId, Set<WebSocket>>
    this.clients = new Map();

    // Setup handlers
    this.setupWebSocketHandlers();
    this.setupRedisHandlers();
  }

  /**
   * Setup WebSocket connection handlers
   */
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      logger.info(`[WS] New connection attempt from ${req.socket.remoteAddress}`);

      // Authenticate client
      const token = this.extractToken(req);
      if (!token) {
        logger.warn(`[WS] Connection rejected: no token`);
        ws.close(4001, 'Unauthorized: missing token');
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        logger.warn(`[WS] Connection rejected: invalid token`);
        ws.close(4001, 'Unauthorized: invalid token');
        return;
      }

      const userId = payload.userId;
      logger.info(`[WS] Client authenticated: ${userId}`);

      // Register client
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to live updates',
        timestamp: new Date().toISOString()
      }));

      // Setup message handlers
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(userId, ws, message);
        } catch (err) {
          logger.error(`[WS] Message parse error: ${err.message}`);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Setup close handler
      ws.on('close', () => {
        logger.info(`[WS] Client disconnected: ${userId}`);
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            this.clients.delete(userId);
          }
        }
      });

      // Setup error handler
      ws.on('error', (err) => {
        logger.error(`[WS] Client error: ${err.message}`);
      });
    });

    logger.info(`[WS] WebSocket server listening on ${this.options.path}`);
  }

  /**
   * Setup Redis pub/sub handlers
   */
  setupRedisHandlers() {
    this.redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        logger.debug(`[WS] Redis message on ${channel}: ${data.type}`);

        // Parse channel: job:{jobId}
        const match = channel.match(/^job:(.+)$/);
        if (!match) {
          logger.warn(`[WS] Invalid channel format: ${channel}`);
          return;
        }

        const jobId = match[1];

        // Extract userId from message or find from connected clients
        if (data.userId) {
          this.broadcastToUser(data.userId, {
            type: data.type,
            jobId,
            ...data
          });
        }
      } catch (err) {
        logger.error(`[WS] Redis message error: ${err.message}`);
      }
    });

    this.redisSub.on('error', (err) => {
      logger.error(`[WS] Redis subscription error: ${err.message}`);
    });

    // Subscribe to all job channels (will be filtered by client userId)
    this.redisSub.psubscribe('job:*', (err, count) => {
      if (err) {
        logger.error(`[WS] Redis subscription failed: ${err.message}`);
      } else {
        logger.info(`[WS] Subscribed to ${count} channel patterns`);
      }
    });
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(userId, ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'subscribe':
        logger.info(`[WS] Client ${userId} subscribed to job ${data.jobId}`);
        ws.send(JSON.stringify({
          type: 'subscribed',
          jobId: data.jobId,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'unsubscribe':
        logger.info(`[WS] Client ${userId} unsubscribed from job ${data.jobId}`);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          jobId: data.jobId,
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        logger.warn(`[WS] Unknown message type: ${type}`);
    }
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  /**
   * Broadcast message to specific user's clients
   */
  broadcastToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      logger.debug(`[WS] No clients connected for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    let sent = 0;
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sent++;
      }
    });

    logger.debug(`[WS] Broadcast to ${sent}/${userClients.size} clients for user ${userId}`);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message) {
    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    let sent = 0;
    this.clients.forEach((userClients) => {
      userClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
          sent++;
        }
      });
    });

    logger.debug(`[WS] Broadcast to ${sent} total clients`);
  }

  /**
   * Publish job update via Redis (for horizontal scaling)
   */
  async publishJobUpdate(jobId, userId, status, progress, stage, message) {
    const channel = `job:${jobId}`;
    const data = {
      type: 'progress',
      jobId,
      userId,
      status,
      progress,
      stage,
      message
    };

    try {
      await this.redisPub.publish(channel, JSON.stringify(data));
      logger.debug(`[WS] Published to ${channel}`);
    } catch (err) {
      logger.error(`[WS] Publish error: ${err.message}`);
    }
  }

  /**
   * Close server
   */
  close() {
    logger.info('[WS] Closing WebSocket server');
    this.wss.close();
    this.redisPub.disconnect();
    this.redisSub.disconnect();
  }

  /**
   * Get connection stats
   */
  getStats() {
    let totalClients = 0;
    this.clients.forEach((userClients) => {
      totalClients += userClients.size;
    });

    return {
      totalUsers: this.clients.size,
      totalClients,
      clientsByUser: Array.from(this.clients.entries()).map(([userId, clients]) => ({
        userId,
        connections: clients.size
      }))
    };
  }
}

module.exports = WebSocketServer;
