/**
 * Analytics & Billing Module
 * 
 * Tracks per-user usage metrics for billing:
 * - bytes_processed: Total bytes processed per user
 * - compute_seconds: Total compute time per user
 * - job_count: Number of jobs processed
 * - storage_used: Current storage usage
 */

const IORedis = require('ioredis');
const config = require('./config');

const redis = new IORedis(config.REDIS_URL);

/**
 * Track bytes processed for a user
 */
async function trackBytesProcessed(userId, bytes, jobId) {
  if (!userId || !bytes) return;
  
  const timestamp = new Date().toISOString();
  const key = `billing:user:${userId}`;
  
  try {
    // Increment total bytes
    await redis.hincrby(key, 'bytes_processed', bytes);
    
    // Track daily usage for trend analysis
    const dateKey = `billing:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrby(dateKey, 'bytes_processed', bytes);
    
    // Set expiration on daily key (90 days)
    await redis.expire(dateKey, 90 * 24 * 60 * 60);
    
    // Track per-job for detailed audit
    const jobKey = `billing:job:${jobId}`;
    await redis.hset(jobKey, 'bytes_processed', bytes);
    await redis.hset(jobKey, 'user_id', userId);
    await redis.hset(jobKey, 'timestamp', timestamp);
    await redis.expire(jobKey, 365 * 24 * 60 * 60); // Keep for 1 year
    
  } catch (err) {
    console.error('Failed to track bytes processed', { userId, bytes, jobId, error: err.message });
  }
}

/**
 * Track compute seconds for a user
 */
async function trackComputeSeconds(userId, seconds, jobId) {
  if (!userId || !seconds) return;
  
  const timestamp = new Date().toISOString();
  const key = `billing:user:${userId}`;
  
  try {
    // Increment total compute seconds
    await redis.hincrbyfloat(key, 'compute_seconds', seconds);
    
    // Track daily usage
    const dateKey = `billing:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrbyfloat(dateKey, 'compute_seconds', seconds);
    await redis.expire(dateKey, 90 * 24 * 60 * 60);
    
    // Track per-job
    const jobKey = `billing:job:${jobId}`;
    await redis.hset(jobKey, 'compute_seconds', seconds);
    await redis.hset(jobKey, 'timestamp', timestamp);
    
  } catch (err) {
    console.error('Failed to track compute seconds', { userId, seconds, jobId, error: err.message });
  }
}

/**
 * Track job completion for a user
 */
async function trackJobCompletion(userId, jobId, status, metadata = {}) {
  if (!userId || !jobId) return;
  
  const timestamp = new Date().toISOString();
  const key = `billing:user:${userId}`;
  
  try {
    // Increment job count
    await redis.hincrby(key, 'job_count', 1);
    
    // Track by status
    await redis.hincrby(key, `jobs_${status}`, 1);
    
    // Daily tracking
    const dateKey = `billing:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
    await redis.hincrby(dateKey, 'job_count', 1);
    await redis.hincrby(dateKey, `jobs_${status}`, 1);
    await redis.expire(dateKey, 90 * 24 * 60 * 60);
    
    // Job details
    const jobKey = `billing:job:${jobId}`;
    await redis.hset(jobKey, 'status', status);
    await redis.hset(jobKey, 'completed_at', timestamp);
    await redis.hset(jobKey, 'metadata', JSON.stringify(metadata));
    
  } catch (err) {
    console.error('Failed to track job completion', { userId, jobId, status, error: err.message });
  }
}

/**
 * Get user billing summary
 */
async function getUserBillingSummary(userId) {
  if (!userId) return null;
  
  try {
    const key = `billing:user:${userId}`;
    const data = await redis.hgetall(key);
    
    if (Object.keys(data).length === 0) {
      return {
        user_id: userId,
        bytes_processed: 0,
        compute_seconds: 0,
        job_count: 0,
        jobs_completed: 0,
        jobs_failed: 0,
        jobs_skipped: 0,
        estimated_cost: 0
      };
    }
    
    const bytesProcessed = parseInt(data.bytes_processed || 0, 10);
    const computeSeconds = parseFloat(data.compute_seconds || 0);
    const jobCount = parseInt(data.job_count || 0, 10);
    
    // Estimate cost (example: $0.001 per GB + $0.0001 per compute second)
    const gbProcessed = bytesProcessed / (1024 * 1024 * 1024);
    const estimatedCost = (gbProcessed * 0.001) + (computeSeconds * 0.0001);
    
    return {
      user_id: userId,
      bytes_processed: bytesProcessed,
      bytes_processed_gb: parseFloat((bytesProcessed / (1024 * 1024 * 1024)).toFixed(2)),
      compute_seconds: parseFloat(computeSeconds.toFixed(2)),
      compute_hours: parseFloat((computeSeconds / 3600).toFixed(2)),
      job_count: jobCount,
      jobs_completed: parseInt(data.jobs_completed || 0, 10),
      jobs_failed: parseInt(data.jobs_failed || 0, 10),
      jobs_skipped: parseInt(data.jobs_skipped || 0, 10),
      estimated_cost: parseFloat(estimatedCost.toFixed(4))
    };
  } catch (err) {
    console.error('Failed to get billing summary', { userId, error: err.message });
    return null;
  }
}

/**
 * Get user daily usage for a date range
 */
async function getUserDailyUsage(userId, startDate, endDate) {
  if (!userId) return [];
  
  try {
    const usage = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const key = `billing:daily:${userId}:${dateStr}`;
      const data = await redis.hgetall(key);
      
      if (Object.keys(data).length > 0) {
        usage.push({
          date: dateStr,
          bytes_processed: parseInt(data.bytes_processed || 0, 10),
          compute_seconds: parseFloat(data.compute_seconds || 0),
          job_count: parseInt(data.job_count || 0, 10),
          jobs_completed: parseInt(data.jobs_completed || 0, 10),
          jobs_failed: parseInt(data.jobs_failed || 0, 10)
        });
      }
    }
    
    return usage;
  } catch (err) {
    console.error('Failed to get daily usage', { userId, startDate, endDate, error: err.message });
    return [];
  }
}

/**
 * Get job billing details
 */
async function getJobBillingDetails(jobId) {
  if (!jobId) return null;
  
  try {
    const key = `billing:job:${jobId}`;
    const data = await redis.hgetall(key);
    
    if (Object.keys(data).length === 0) {
      return null;
    }
    
    const bytesProcessed = parseInt(data.bytes_processed || 0, 10);
    const computeSeconds = parseFloat(data.compute_seconds || 0);
    
    // Calculate cost for this job
    const gbProcessed = bytesProcessed / (1024 * 1024 * 1024);
    const jobCost = (gbProcessed * 0.001) + (computeSeconds * 0.0001);
    
    return {
      job_id: jobId,
      user_id: data.user_id,
      bytes_processed: bytesProcessed,
      bytes_processed_mb: parseFloat((bytesProcessed / (1024 * 1024)).toFixed(2)),
      compute_seconds: parseFloat(computeSeconds.toFixed(2)),
      status: data.status,
      timestamp: data.timestamp,
      completed_at: data.completed_at,
      job_cost: parseFloat(jobCost.toFixed(4)),
      metadata: data.metadata ? JSON.parse(data.metadata) : {}
    };
  } catch (err) {
    console.error('Failed to get job billing details', { jobId, error: err.message });
    return null;
  }
}

/**
 * Get all users' billing summary (admin)
 */
async function getAllUsersBillingSummary() {
  try {
    const pattern = 'billing:user:*';
    const keys = await redis.keys(pattern);
    
    const summaries = [];
    for (const key of keys) {
      const userId = key.replace('billing:user:', '');
      const summary = await getUserBillingSummary(userId);
      if (summary) {
        summaries.push(summary);
      }
    }
    
    // Sort by estimated cost (descending)
    summaries.sort((a, b) => b.estimated_cost - a.estimated_cost);
    
    return summaries;
  } catch (err) {
    console.error('Failed to get all users billing summary', { error: err.message });
    return [];
  }
}

/**
 * Reset user billing (admin only)
 */
async function resetUserBilling(userId) {
  if (!userId) return false;
  
  try {
    const key = `billing:user:${userId}`;
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('Failed to reset user billing', { userId, error: err.message });
    return false;
  }
}

module.exports = {
  trackBytesProcessed,
  trackComputeSeconds,
  trackJobCompletion,
  getUserBillingSummary,
  getUserDailyUsage,
  getJobBillingDetails,
  getAllUsersBillingSummary,
  resetUserBilling
};
