// IMPORTANT: set AWS credentials in environment: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./config');

const s3 = new S3Client({ region: config.AWS_REGION });

async function createPresign(key, contentType, expiresSeconds = 60 * 10) {
  const cmd = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'private'
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
  return { url, expiresIn: expiresSeconds };
}

module.exports = { createPresign };
