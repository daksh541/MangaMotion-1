/**
 * Storage Lifecycle Management
 * Manages MinIO object lifecycle policies for automatic cleanup and rotation
 * - temp/ - Transient files deleted after X days
 * - processed/ - Output files with optional rotation
 * - originals/ - Original uploads with optional archival
 */

const { S3Client, PutBucketLifecycleConfigurationCommand, GetBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');
const config = require('./config');
const { logger } = require('./logger');

/**
 * Storage paths and their lifecycle policies
 */
const STORAGE_PATHS = {
  temp: {
    prefix: 'temp/',
    description: 'Temporary files (transient)',
    defaultExpirationDays: 7,
    defaultAbortIncompleteMultipartDays: 1,
  },
  processed: {
    prefix: 'processed/',
    description: 'Processed outputs (thumbnails, etc)',
    defaultExpirationDays: 90,
    defaultAbortIncompleteMultipartDays: 1,
  },
  originals: {
    prefix: 'originals/',
    description: 'Original uploaded files',
    defaultExpirationDays: 365,
    defaultAbortIncompleteMultipartDays: 1,
  },
  archive: {
    prefix: 'archive/',
    description: 'Archived files (long-term storage)',
    defaultExpirationDays: null, // Never expire
    defaultAbortIncompleteMultipartDays: 1,
  },
};

/**
 * Build lifecycle rules for MinIO/S3
 * @returns {object} Lifecycle configuration
 */
function buildLifecycleRules() {
  const rules = [];

  // Temporary files - delete after X days
  if (config.STORAGE_TEMP_EXPIRATION_DAYS > 0) {
    rules.push({
      ID: 'delete-temp-files',
      Filter: { Prefix: STORAGE_PATHS.temp.prefix },
      Status: 'Enabled',
      Expiration: {
        Days: config.STORAGE_TEMP_EXPIRATION_DAYS,
      },
      AbortIncompleteMultipartUpload: {
        DaysAfterInitiation: config.STORAGE_ABORT_INCOMPLETE_DAYS,
      },
    });

    logger.info('Lifecycle rule: delete temp files', {
      prefix: STORAGE_PATHS.temp.prefix,
      expiration_days: config.STORAGE_TEMP_EXPIRATION_DAYS,
    });
  }

  // Processed files - delete after X days
  if (config.STORAGE_PROCESSED_EXPIRATION_DAYS > 0) {
    rules.push({
      ID: 'delete-processed-files',
      Filter: { Prefix: STORAGE_PATHS.processed.prefix },
      Status: 'Enabled',
      Expiration: {
        Days: config.STORAGE_PROCESSED_EXPIRATION_DAYS,
      },
      AbortIncompleteMultipartUpload: {
        DaysAfterInitiation: config.STORAGE_ABORT_INCOMPLETE_DAYS,
      },
    });

    logger.info('Lifecycle rule: delete processed files', {
      prefix: STORAGE_PATHS.processed.prefix,
      expiration_days: config.STORAGE_PROCESSED_EXPIRATION_DAYS,
    });
  }

  // Original files - delete after X days (optional)
  if (config.STORAGE_ORIGINALS_EXPIRATION_DAYS > 0) {
    rules.push({
      ID: 'delete-original-files',
      Filter: { Prefix: STORAGE_PATHS.originals.prefix },
      Status: 'Enabled',
      Expiration: {
        Days: config.STORAGE_ORIGINALS_EXPIRATION_DAYS,
      },
      AbortIncompleteMultipartUpload: {
        DaysAfterInitiation: config.STORAGE_ABORT_INCOMPLETE_DAYS,
      },
    });

    logger.info('Lifecycle rule: delete original files', {
      prefix: STORAGE_PATHS.originals.prefix,
      expiration_days: config.STORAGE_ORIGINALS_EXPIRATION_DAYS,
    });
  }

  // Abort incomplete multipart uploads
  rules.push({
    ID: 'abort-incomplete-multipart',
    Filter: {},
    Status: 'Enabled',
    AbortIncompleteMultipartUpload: {
      DaysAfterInitiation: config.STORAGE_ABORT_INCOMPLETE_DAYS,
    },
  });

  return { Rules: rules };
}

/**
 * Apply lifecycle configuration to bucket
 * @param {S3Client} s3Client - S3 client instance
 * @returns {Promise<boolean>}
 */
async function applyLifecyclePolicy(s3Client) {
  try {
    const lifecycleConfig = buildLifecycleRules();

    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: config.S3_BUCKET,
      LifecycleConfiguration: lifecycleConfig,
    });

    await s3Client.send(command);

    logger.info('Lifecycle policy applied successfully', {
      bucket: config.S3_BUCKET,
      rules_count: lifecycleConfig.Rules.length,
    });

    return true;
  } catch (err) {
    logger.error('Failed to apply lifecycle policy', {
      bucket: config.S3_BUCKET,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get current lifecycle configuration
 * @param {S3Client} s3Client - S3 client instance
 * @returns {Promise<object>}
 */
async function getLifecyclePolicy(s3Client) {
  try {
    const command = new GetBucketLifecycleConfigurationCommand({
      Bucket: config.S3_BUCKET,
    });

    const response = await s3Client.send(command);

    logger.info('Retrieved lifecycle policy', {
      bucket: config.S3_BUCKET,
      rules_count: response.Rules?.length || 0,
    });

    return response;
  } catch (err) {
    if (err.name === 'NoSuchLifecycleConfiguration') {
      logger.info('No lifecycle policy configured', {
        bucket: config.S3_BUCKET,
      });
      return null;
    }

    logger.error('Failed to get lifecycle policy', {
      bucket: config.S3_BUCKET,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Generate object key for temporary storage
 * @param {string} jobId - Job ID
 * @param {string} filename - Original filename
 * @returns {string}
 */
function getTempKey(jobId, filename) {
  return `temp/${jobId}/${filename}`;
}

/**
 * Generate object key for processed storage
 * @param {string} jobId - Job ID
 * @param {string} filename - Output filename
 * @returns {string}
 */
function getProcessedKey(jobId, filename) {
  return `processed/${jobId}/${filename}`;
}

/**
 * Generate object key for original storage
 * @param {string} jobId - Job ID
 * @param {string} filename - Original filename
 * @returns {string}
 */
function getOriginalKey(jobId, filename) {
  return `originals/${jobId}/${filename}`;
}

/**
 * Generate object key for archive storage
 * @param {string} jobId - Job ID
 * @param {string} filename - Filename
 * @returns {string}
 */
function getArchiveKey(jobId, filename) {
  return `archive/${jobId}/${filename}`;
}

/**
 * Get storage path info
 * @param {string} prefix - Storage prefix (temp, processed, originals, archive)
 * @returns {object}
 */
function getStoragePath(prefix) {
  return STORAGE_PATHS[prefix] || null;
}

/**
 * Get all storage paths
 * @returns {object}
 */
function getAllStoragePaths() {
  return STORAGE_PATHS;
}

/**
 * Lifecycle policy manager
 */
class StorageLifecycleManager {
  constructor(s3Client) {
    this.s3Client = s3Client;
    this.initialized = false;
    this.policyApplied = false;
  }

  /**
   * Initialize lifecycle manager
   */
  async initialize() {
    try {
      if (!this.s3Client) {
        throw new Error('S3 client is required');
      }

      // Check if lifecycle policy exists
      const existingPolicy = await getLifecyclePolicy(this.s3Client);

      if (!existingPolicy) {
        // Apply default policy
        await applyLifecyclePolicy(this.s3Client);
        this.policyApplied = true;
      } else {
        logger.info('Existing lifecycle policy found, skipping initialization');
        this.policyApplied = true;
      }

      this.initialized = true;

      logger.info('Storage lifecycle manager initialized', {
        bucket: config.S3_BUCKET,
        policy_applied: this.policyApplied,
      });
    } catch (err) {
      logger.error('Failed to initialize storage lifecycle manager', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Update lifecycle policy
   */
  async updatePolicy() {
    try {
      await applyLifecyclePolicy(this.s3Client);
      this.policyApplied = true;

      logger.info('Lifecycle policy updated', {
        bucket: config.S3_BUCKET,
      });
    } catch (err) {
      logger.error('Failed to update lifecycle policy', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Get current policy
   */
  async getPolicy() {
    try {
      return await getLifecyclePolicy(this.s3Client);
    } catch (err) {
      logger.error('Failed to get lifecycle policy', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Get policy status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      policyApplied: this.policyApplied,
      bucket: config.S3_BUCKET,
      tempExpirationDays: config.STORAGE_TEMP_EXPIRATION_DAYS,
      processedExpirationDays: config.STORAGE_PROCESSED_EXPIRATION_DAYS,
      originalsExpirationDays: config.STORAGE_ORIGINALS_EXPIRATION_DAYS,
      abortIncompleteMultipartDays: config.STORAGE_ABORT_INCOMPLETE_DAYS,
    };
  }
}

module.exports = {
  STORAGE_PATHS,
  getTempKey,
  getProcessedKey,
  getOriginalKey,
  getArchiveKey,
  getStoragePath,
  getAllStoragePaths,
  applyLifecyclePolicy,
  getLifecyclePolicy,
  StorageLifecycleManager,
};
