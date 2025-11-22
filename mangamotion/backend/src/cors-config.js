/**
 * CORS Configuration for MinIO and API
 * Restricts cross-origin access to authorized domains only
 */

const config = require('./config');
const { logger } = require('./logger');

/**
 * Parse allowed origins from environment variable
 * Format: "https://example.com,https://app.example.com"
 * @returns {string[]}
 */
function getAllowedOrigins() {
  const allowedOriginsEnv = config.CORS_ALLOWED_ORIGINS || '';
  
  if (!allowedOriginsEnv) {
    logger.warn('CORS_ALLOWED_ORIGINS not configured, using defaults');
    
    // Development defaults
    if (config.NODE_ENV === 'development') {
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
      ];
    }
    
    // Production: deny all by default
    return [];
  }

  return allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * CORS middleware for Express
 * Restricts cross-origin requests to authorized domains
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Request-ID');
    res.setHeader('Access-Control-Max-Age', '3600');
    res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (origin && allowedOrigins.includes(origin)) {
      res.sendStatus(200);
    } else {
      res.sendStatus(403);
    }
    return;
  }

  next();
}

/**
 * MinIO CORS configuration object
 * Used for bucket-level CORS settings
 */
function getMinIOCORSConfig() {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    logger.warn('No CORS origins configured for MinIO');
    return {
      CORSRules: [],
    };
  }

  return {
    CORSRules: [
      {
        AllowedOrigins: allowedOrigins,
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag', 'x-amz-version-id'],
        MaxAgeSeconds: 3600,
      },
    ],
  };
}

/**
 * Validate origin for presigned URL requests
 * @param {string} origin - Request origin
 * @returns {boolean}
 */
function isOriginAllowed(origin) {
  if (!origin) {
    return true; // Allow requests without origin (e.g., from server-side)
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get CORS headers for response
 * @param {string} origin - Request origin
 * @returns {object}
 */
function getCORSHeaders(origin) {
  const allowedOrigins = getAllowedOrigins();
  const headers = {};

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-User-ID, X-Request-ID';
    headers['Access-Control-Max-Age'] = '3600';
    headers['Access-Control-Expose-Headers'] = 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset';
  }

  return headers;
}

/**
 * Log CORS configuration
 */
function logCORSConfig() {
  const allowedOrigins = getAllowedOrigins();
  
  logger.info('CORS Configuration', {
    environment: config.NODE_ENV,
    allowed_origins: allowedOrigins,
    origin_count: allowedOrigins.length,
  });
}

// Log configuration on module load
logCORSConfig();

module.exports = {
  corsMiddleware,
  getMinIOCORSConfig,
  isOriginAllowed,
  getCORSHeaders,
  getAllowedOrigins,
  logCORSConfig,
};
