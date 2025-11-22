/**
 * Secure MinIO Client with TLS Support
 * Handles S3-compatible object storage with TLS encryption and CORS
 */

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');
const fs = require('fs');
const config = require('./config');
const { logger } = require('./logger');

/**
 * Create S3 client with TLS support
 * Supports both AWS S3 and MinIO with TLS
 */
function createS3Client() {
  const clientConfig = {
    region: config.AWS_REGION,
  };

  // Configure endpoint for MinIO or S3-compatible storage
  if (config.S3_ENDPOINT && config.S3_ENDPOINT !== 'https://s3.amazonaws.com') {
    clientConfig.endpoint = config.S3_ENDPOINT;
    clientConfig.forcePathStyle = config.S3_FORCE_PATH_STYLE === 'true' || config.S3_FORCE_PATH_STYLE === true;
  }

  // Configure credentials
  if (config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
    clientConfig.credentials = {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    };
  }

  // TLS Configuration
  if (config.S3_USE_TLS === 'true' || config.S3_USE_TLS === true) {
    // For HTTPS endpoints, configure TLS
    const httpsAgent = new https.Agent({
      rejectUnauthorized: config.S3_TLS_VERIFY !== 'false',
    });

    // Load custom CA certificate if provided
    if (config.S3_CA_CERT_PATH && fs.existsSync(config.S3_CA_CERT_PATH)) {
      try {
        const caCert = fs.readFileSync(config.S3_CA_CERT_PATH);
        httpsAgent.options.ca = caCert;
        logger.info('Loaded custom CA certificate for S3/MinIO', {
          ca_cert_path: config.S3_CA_CERT_PATH,
        });
      } catch (err) {
        logger.error('Failed to load CA certificate', {
          ca_cert_path: config.S3_CA_CERT_PATH,
          error: err.message,
        });
      }
    }

    clientConfig.httpAgent = httpsAgent;
    clientConfig.httpsAgent = httpsAgent;
  }

  logger.info('Creating S3 client', {
    endpoint: config.S3_ENDPOINT,
    region: config.AWS_REGION,
    use_tls: config.S3_USE_TLS,
    tls_verify: config.S3_TLS_VERIFY,
  });

  return new S3Client(clientConfig);
}

// Create singleton S3 client
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

/**
 * Create presigned PUT URL for file upload
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type
 * @param {number} expiresSeconds - URL expiration time in seconds (default: 600)
 * @returns {Promise<{url: string, expiresIn: number}>}
 */
async function createPresign(key, contentType, expiresSeconds = 600) {
  try {
    const client = getS3Client();
    
    const cmd = new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
      // Add metadata for tracking
      Metadata: {
        'created-at': new Date().toISOString(),
        'source': 'mangamotion-api',
      },
    });

    const url = await getSignedUrl(client, cmd, { expiresIn: expiresSeconds });
    
    logger.info('Presigned URL created', {
      key,
      content_type: contentType,
      expires_in: expiresSeconds,
    });

    return { url, expiresIn: expiresSeconds };
  } catch (err) {
    logger.error('Failed to create presigned URL', {
      key,
      error: err.message,
      error_stack: err.stack,
    });
    throw err;
  }
}

/**
 * Create presigned GET URL for file download
 * @param {string} key - S3 object key
 * @param {number} expiresSeconds - URL expiration time in seconds (default: 3600)
 * @returns {Promise<{url: string, expiresIn: number}>}
 */
async function createGetPresign(key, expiresSeconds = 3600) {
  try {
    const client = getS3Client();
    
    const cmd = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(client, cmd, { expiresIn: expiresSeconds });
    
    logger.info('Presigned GET URL created', {
      key,
      expires_in: expiresSeconds,
    });

    return { url, expiresIn: expiresSeconds };
  } catch (err) {
    logger.error('Failed to create presigned GET URL', {
      key,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Check if object exists in S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>}
 */
async function objectExists(key) {
  try {
    const client = getS3Client();
    
    const cmd = new HeadObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });

    await client.send(cmd);
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    logger.error('Error checking object existence', {
      key,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get object metadata
 * @param {string} key - S3 object key
 * @returns {Promise<object>}
 */
async function getObjectMetadata(key) {
  try {
    const client = getS3Client();
    
    const cmd = new HeadObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });

    const response = await client.send(cmd);
    
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
      metadata: response.Metadata,
    };
  } catch (err) {
    logger.error('Failed to get object metadata', {
      key,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Verify S3/MinIO connectivity
 * @returns {Promise<boolean>}
 */
async function verifyConnectivity() {
  try {
    const client = getS3Client();
    
    // Try to list objects with limit of 1
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const cmd = new ListObjectsV2Command({
      Bucket: config.S3_BUCKET,
      MaxKeys: 1,
    });

    await client.send(cmd);
    
    logger.info('S3/MinIO connectivity verified', {
      endpoint: config.S3_ENDPOINT,
      bucket: config.S3_BUCKET,
    });
    
    return true;
  } catch (err) {
    logger.error('S3/MinIO connectivity check failed', {
      endpoint: config.S3_ENDPOINT,
      bucket: config.S3_BUCKET,
      error: err.message,
    });
    return false;
  }
}

module.exports = {
  createPresign,
  createGetPresign,
  objectExists,
  getObjectMetadata,
  verifyConnectivity,
  getS3Client,
};
