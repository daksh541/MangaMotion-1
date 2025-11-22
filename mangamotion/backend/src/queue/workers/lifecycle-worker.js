/**
 * Storage Lifecycle Worker
 * Periodically cleans up old temporary and processed files
 * Runs as a scheduled job (e.g., daily)
 */

const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../../config');
const { logger } = require('../../logger');
const { incrementCounter, recordHistogram } = require('../../metrics');
const { getTempKey, getProcessedKey, STORAGE_PATHS } = require('../../storage-lifecycle');

/**
 * List objects in a prefix
 * @param {S3Client} s3Client - S3 client
 * @param {string} prefix - Prefix to list
 * @returns {Promise<Array>}
 */
async function listObjects(s3Client, prefix) {
  const objects = [];
  let continuationToken = null;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: config.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        objects.push(...response.Contents);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  } catch (err) {
    logger.error('Failed to list objects', {
      prefix,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Delete object from S3
 * @param {S3Client} s3Client - S3 client
 * @param {string} key - Object key
 * @returns {Promise<boolean>}
 */
async function deleteObject(s3Client, key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (err) {
    logger.error('Failed to delete object', {
      key,
      error: err.message,
    });
    return false;
  }
}

/**
 * Check if object is expired
 * @param {object} object - S3 object metadata
 * @param {number} expirationDays - Expiration period in days
 * @returns {boolean}
 */
function isObjectExpired(object, expirationDays) {
  if (!expirationDays || expirationDays <= 0) {
    return false;
  }

  const lastModified = new Date(object.LastModified);
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - expirationDays);

  return lastModified < expirationDate;
}

/**
 * Clean temporary files
 * @param {S3Client} s3Client - S3 client
 * @returns {Promise<object>}
 */
async function cleanTempFiles(s3Client) {
  const startTime = Date.now();
  let deletedCount = 0;
  let skippedCount = 0;

  try {
    logger.info('Starting temp file cleanup', {
      prefix: STORAGE_PATHS.temp.prefix,
      expiration_days: config.STORAGE_TEMP_EXPIRATION_DAYS,
    });

    const objects = await listObjects(s3Client, STORAGE_PATHS.temp.prefix);

    logger.info('Found temp objects', {
      count: objects.length,
    });

    for (const object of objects) {
      if (isObjectExpired(object, config.STORAGE_TEMP_EXPIRATION_DAYS)) {
        const deleted = await deleteObject(s3Client, object.Key);
        if (deleted) {
          deletedCount++;
          logger.debug('Deleted temp object', {
            key: object.Key,
            last_modified: object.LastModified,
          });
        } else {
          skippedCount++;
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    logger.info('Temp file cleanup completed', {
      deleted_count: deletedCount,
      skipped_count: skippedCount,
      duration_seconds: duration,
    });

    incrementCounter('lifecycle_temp_cleanup_total');
    recordHistogram('lifecycle_cleanup_seconds', duration);

    return {
      type: 'temp',
      deletedCount,
      skippedCount,
      duration,
    };
  } catch (err) {
    logger.error('Temp file cleanup failed', {
      error: err.message,
    });
    incrementCounter('lifecycle_cleanup_failed_total');
    throw err;
  }
}

/**
 * Clean processed files
 * @param {S3Client} s3Client - S3 client
 * @returns {Promise<object>}
 */
async function cleanProcessedFiles(s3Client) {
  const startTime = Date.now();
  let deletedCount = 0;
  let skippedCount = 0;

  try {
    logger.info('Starting processed file cleanup', {
      prefix: STORAGE_PATHS.processed.prefix,
      expiration_days: config.STORAGE_PROCESSED_EXPIRATION_DAYS,
    });

    const objects = await listObjects(s3Client, STORAGE_PATHS.processed.prefix);

    logger.info('Found processed objects', {
      count: objects.length,
    });

    for (const object of objects) {
      if (isObjectExpired(object, config.STORAGE_PROCESSED_EXPIRATION_DAYS)) {
        const deleted = await deleteObject(s3Client, object.Key);
        if (deleted) {
          deletedCount++;
          logger.debug('Deleted processed object', {
            key: object.Key,
            last_modified: object.LastModified,
          });
        } else {
          skippedCount++;
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    logger.info('Processed file cleanup completed', {
      deleted_count: deletedCount,
      skipped_count: skippedCount,
      duration_seconds: duration,
    });

    incrementCounter('lifecycle_processed_cleanup_total');
    recordHistogram('lifecycle_cleanup_seconds', duration);

    return {
      type: 'processed',
      deletedCount,
      skippedCount,
      duration,
    };
  } catch (err) {
    logger.error('Processed file cleanup failed', {
      error: err.message,
    });
    incrementCounter('lifecycle_cleanup_failed_total');
    throw err;
  }
}

/**
 * Clean original files (optional)
 * @param {S3Client} s3Client - S3 client
 * @returns {Promise<object>}
 */
async function cleanOriginalFiles(s3Client) {
  const startTime = Date.now();
  let deletedCount = 0;
  let skippedCount = 0;

  try {
    if (config.STORAGE_ORIGINALS_EXPIRATION_DAYS <= 0) {
      logger.info('Original file cleanup disabled');
      return {
        type: 'originals',
        deletedCount: 0,
        skippedCount: 0,
        duration: 0,
      };
    }

    logger.info('Starting original file cleanup', {
      prefix: STORAGE_PATHS.originals.prefix,
      expiration_days: config.STORAGE_ORIGINALS_EXPIRATION_DAYS,
    });

    const objects = await listObjects(s3Client, STORAGE_PATHS.originals.prefix);

    logger.info('Found original objects', {
      count: objects.length,
    });

    for (const object of objects) {
      if (isObjectExpired(object, config.STORAGE_ORIGINALS_EXPIRATION_DAYS)) {
        const deleted = await deleteObject(s3Client, object.Key);
        if (deleted) {
          deletedCount++;
          logger.debug('Deleted original object', {
            key: object.Key,
            last_modified: object.LastModified,
          });
        } else {
          skippedCount++;
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    logger.info('Original file cleanup completed', {
      deleted_count: deletedCount,
      skipped_count: skippedCount,
      duration_seconds: duration,
    });

    incrementCounter('lifecycle_originals_cleanup_total');
    recordHistogram('lifecycle_cleanup_seconds', duration);

    return {
      type: 'originals',
      deletedCount,
      skippedCount,
      duration,
    };
  } catch (err) {
    logger.error('Original file cleanup failed', {
      error: err.message,
    });
    incrementCounter('lifecycle_cleanup_failed_total');
    throw err;
  }
}

/**
 * Run full lifecycle cleanup
 * @param {S3Client} s3Client - S3 client
 * @returns {Promise<object>}
 */
async function runFullCleanup(s3Client) {
  const startTime = Date.now();
  const results = [];

  try {
    logger.info('Starting full storage lifecycle cleanup');

    // Clean temp files
    const tempResult = await cleanTempFiles(s3Client);
    results.push(tempResult);

    // Clean processed files
    const processedResult = await cleanProcessedFiles(s3Client);
    results.push(processedResult);

    // Clean original files (if enabled)
    const originalsResult = await cleanOriginalFiles(s3Client);
    results.push(originalsResult);

    const totalDuration = (Date.now() - startTime) / 1000;
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);

    logger.info('Full storage lifecycle cleanup completed', {
      total_deleted: totalDeleted,
      total_duration_seconds: totalDuration,
      results,
    });

    incrementCounter('lifecycle_full_cleanup_total');

    return {
      success: true,
      totalDeleted,
      totalDuration,
      results,
    };
  } catch (err) {
    logger.error('Full storage lifecycle cleanup failed', {
      error: err.message,
    });
    incrementCounter('lifecycle_cleanup_failed_total');
    throw err;
  }
}

/**
 * Lifecycle worker job processor
 * Called by job queue
 */
async function processLifecycleJob(job) {
  try {
    logger.info('Processing lifecycle job', {
      job_id: job.id,
      job_type: job.data.type,
    });

    // Create S3 client
    const s3Client = new S3Client({
      region: config.AWS_REGION,
      endpoint: config.S3_ENDPOINT,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true',
    });

    let result;

    switch (job.data.type) {
      case 'temp':
        result = await cleanTempFiles(s3Client);
        break;
      case 'processed':
        result = await cleanProcessedFiles(s3Client);
        break;
      case 'originals':
        result = await cleanOriginalFiles(s3Client);
        break;
      case 'full':
      default:
        result = await runFullCleanup(s3Client);
        break;
    }

    logger.info('Lifecycle job completed', {
      job_id: job.id,
      result,
    });

    return result;
  } catch (err) {
    logger.error('Lifecycle job failed', {
      job_id: job.id,
      error: err.message,
    });
    throw err;
  }
}

module.exports = {
  listObjects,
  deleteObject,
  isObjectExpired,
  cleanTempFiles,
  cleanProcessedFiles,
  cleanOriginalFiles,
  runFullCleanup,
  processLifecycleJob,
};
