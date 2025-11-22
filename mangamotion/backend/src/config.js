module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  S3_BUCKET: process.env.S3_BUCKET || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || 'false',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  MAX_FILE_COUNT: 50,
  
  // File validation
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
  ALLOWED_EXTENSIONS: (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,bmp,webp,mp4,avi,mov,mkv').split(',').map(e => e.trim().toLowerCase()),
  ALLOWED_CONTENT_TYPES: (process.env.ALLOWED_CONTENT_TYPES || 'image/jpeg,image/png,image/gif,image/bmp,image/webp,video/mp4,video/x-msvideo,video/quicktime,video/x-matroska').split(',').map(e => e.trim().toLowerCase()),
  
  // Per-user upload quota (in MB per hour)
  USER_UPLOAD_QUOTA_MB: parseInt(process.env.USER_UPLOAD_QUOTA_MB || '500', 10),
  QUOTA_WINDOW_HOURS: parseInt(process.env.QUOTA_WINDOW_HOURS || '1', 10),
  
  // Rate limiting for upload job creation
  RATE_LIMIT_JOBS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_JOBS_PER_MINUTE || '10', 10),
  RATE_LIMIT_WINDOW_SECONDS: 60,
  
  // ClamAV malware scanning
  CLAMAV_ENABLED: process.env.CLAMAV_ENABLED === 'true' || false,
  CLAMAV_HOST: process.env.CLAMAV_HOST || 'localhost',
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  CLAMAV_TIMEOUT_MS: parseInt(process.env.CLAMAV_TIMEOUT_MS || '30000', 10),
  SCAN_ON_UPLOAD: process.env.SCAN_ON_UPLOAD === 'true' || true,
  
  // TLS/HTTPS Configuration for MinIO
  S3_USE_TLS: process.env.S3_USE_TLS || 'false',
  S3_TLS_VERIFY: process.env.S3_TLS_VERIFY !== 'false',
  S3_CA_CERT_PATH: process.env.S3_CA_CERT_PATH || '',
  
  // CORS Configuration
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || '',
  
  // Access Key Rotation Configuration
  SECRET_PROVIDER: process.env.SECRET_PROVIDER || 'environment',
  AWS_SECRET_NAME: process.env.AWS_SECRET_NAME || 'mangamotion/s3-credentials',
  VAULT_ADDR: process.env.VAULT_ADDR || 'http://localhost:8200',
  VAULT_TOKEN: process.env.VAULT_TOKEN || '',
  VAULT_SECRET_PATH: process.env.VAULT_SECRET_PATH || 'secret/mangamotion/s3-credentials',
  K8S_SECRET_NAME: process.env.K8S_SECRET_NAME || 'mangamotion-s3-credentials',
  K8S_NAMESPACE: process.env.K8S_NAMESPACE || 'default',
  ACCESS_KEY_ROTATION_DAYS: parseInt(process.env.ACCESS_KEY_ROTATION_DAYS || '90', 10),
  ACCESS_KEY_ROTATION_WARNING_DAYS: parseInt(process.env.ACCESS_KEY_ROTATION_WARNING_DAYS || '14', 10),
  
  // Storage Lifecycle Configuration
  STORAGE_TEMP_EXPIRATION_DAYS: parseInt(process.env.STORAGE_TEMP_EXPIRATION_DAYS || '7', 10),
  STORAGE_PROCESSED_EXPIRATION_DAYS: parseInt(process.env.STORAGE_PROCESSED_EXPIRATION_DAYS || '90', 10),
  STORAGE_ORIGINALS_EXPIRATION_DAYS: parseInt(process.env.STORAGE_ORIGINALS_EXPIRATION_DAYS || '0', 10), // 0 = never expire
  STORAGE_ABORT_INCOMPLETE_DAYS: parseInt(process.env.STORAGE_ABORT_INCOMPLETE_DAYS || '1', 10),
  STORAGE_LIFECYCLE_ENABLED: process.env.STORAGE_LIFECYCLE_ENABLED !== 'false',
  STORAGE_LIFECYCLE_SCHEDULE: process.env.STORAGE_LIFECYCLE_SCHEDULE || '0 2 * * *', // Daily at 2 AM
};
