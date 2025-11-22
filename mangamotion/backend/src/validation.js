const path = require('path');
const config = require('./config');

/**
 * Validates file extension against whitelist
 * @param {string} filename - The filename to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validateExtension(filename) {
  if (!filename) {
    return { valid: false, error: 'Filename is required' };
  }

  const ext = path.extname(filename).toLowerCase().slice(1); // remove leading dot
  if (!ext) {
    return { valid: false, error: 'File must have an extension' };
  }

  if (!config.ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension '.${ext}' not allowed. Allowed: ${config.ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validates content type against whitelist
 * @param {string} contentType - The content type to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validateContentType(contentType) {
  if (!contentType) {
    return { valid: false, error: 'Content-Type is required' };
  }

  const normalizedType = contentType.toLowerCase().split(';')[0].trim(); // handle charset params
  if (!config.ALLOWED_CONTENT_TYPES.includes(normalizedType)) {
    return {
      valid: false,
      error: `Content-Type '${normalizedType}' not allowed. Allowed: ${config.ALLOWED_CONTENT_TYPES.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validates file size
 * @param {number} fileSizeBytes - The file size in bytes
 * @returns {object} { valid: boolean, error?: string }
 */
function validateFileSize(fileSizeBytes) {
  if (fileSizeBytes === undefined || fileSizeBytes === null) {
    return { valid: false, error: 'File size is required' };
  }

  const maxSizeBytes = config.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB exceeds limit of ${config.MAX_FILE_SIZE_MB}MB`
    };
  }

  return { valid: true };
}

/**
 * Validates presign request
 * @param {object} req - Express request object
 * @param {string} filename - The filename
 * @param {string} contentType - The content type
 * @param {number} fileSizeBytes - The file size in bytes
 * @returns {object} { valid: boolean, error?: string }
 */
function validatePresignRequest(filename, contentType, fileSizeBytes) {
  // Validate extension
  const extValidation = validateExtension(filename);
  if (!extValidation.valid) {
    return extValidation;
  }

  // Validate content type
  const typeValidation = validateContentType(contentType);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(fileSizeBytes);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

module.exports = {
  validateExtension,
  validateContentType,
  validateFileSize,
  validatePresignRequest
};
