const {
  validateExtension,
  validateContentType,
  validateFileSize,
  validatePresignRequest
} = require('./validation');

// Test extension validation
console.log('=== Extension Validation Tests ===');
console.log('Valid PNG:', validateExtension('image.png'));
console.log('Valid MP4:', validateExtension('video.mp4'));
console.log('Invalid TXT:', validateExtension('document.txt'));
console.log('No extension:', validateExtension('noextension'));
console.log('Empty filename:', validateExtension(''));

// Test content type validation
console.log('\n=== Content Type Validation Tests ===');
console.log('Valid image/png:', validateContentType('image/png'));
console.log('Valid video/mp4:', validateContentType('video/mp4'));
console.log('Valid with charset:', validateContentType('image/jpeg; charset=utf-8'));
console.log('Invalid application/pdf:', validateContentType('application/pdf'));
console.log('Empty content type:', validateContentType(''));

// Test file size validation
console.log('\n=== File Size Validation Tests ===');
console.log('Valid 50MB:', validateFileSize(50 * 1024 * 1024));
console.log('Valid 100MB:', validateFileSize(100 * 1024 * 1024));
console.log('Invalid 200MB:', validateFileSize(200 * 1024 * 1024));
console.log('Undefined size:', validateFileSize(undefined));

// Test presign request validation
console.log('\n=== Presign Request Validation Tests ===');
console.log('Valid request:', validatePresignRequest('image.png', 'image/png', 50 * 1024 * 1024));
console.log('Invalid extension:', validatePresignRequest('image.txt', 'image/png', 50 * 1024 * 1024));
console.log('Invalid content type:', validatePresignRequest('image.png', 'application/pdf', 50 * 1024 * 1024));
console.log('File too large:', validatePresignRequest('image.png', 'image/png', 200 * 1024 * 1024));
console.log('Missing filename:', validatePresignRequest('', 'image/png', 50 * 1024 * 1024));
