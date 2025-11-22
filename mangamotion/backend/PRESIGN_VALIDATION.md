# Presign File Validation

## Overview
The presign endpoint now enforces comprehensive file validation to ensure only allowed files are uploaded to S3. Validation includes:
- **Extension whitelist**: Only specific file extensions are allowed
- **Content-Type whitelist**: Only specific MIME types are allowed
- **File size limit**: Maximum file size enforced per upload
- **Per-user upload quota**: Track and limit total upload volume per user per time window

## Validation Rules

### Extension Whitelist
Default allowed extensions: `jpg, jpeg, png, gif, bmp, webp, mp4, avi, mov, mkv`

Configure via environment variable:
```bash
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,bmp,webp,mp4,avi,mov,mkv
```

### Content-Type Whitelist
Default allowed content types:
- Images: `image/jpeg, image/png, image/gif, image/bmp, image/webp`
- Videos: `video/mp4, video/x-msvideo, video/quicktime, video/x-matroska`

Configure via environment variable:
```bash
ALLOWED_CONTENT_TYPES=image/jpeg,image/png,image/gif,image/bmp,image/webp,video/mp4,video/x-msvideo,video/quicktime,video/x-matroska
```

### File Size Limit
Default: `100MB`

Configure via environment variable:
```bash
MAX_FILE_SIZE_MB=100
```

### Per-User Upload Quota
Default: `500MB per hour`

Configure via environment variables:
```bash
USER_UPLOAD_QUOTA_MB=500
QUOTA_WINDOW_HOURS=1
```

## API Changes

### POST /api/presign

**Request Body:**
```json
{
  "filename": "page1.png",
  "contentType": "image/png",
  "fileSizeBytes": 1024000
}
```

**Success Response (200):**
```json
{
  "key": "550e8400-e29b-41d4-a716-446655440000_page1.png",
  "url": "https://s3.amazonaws.com/bucket/...",
  "expiresIn": 600
}
```

**Validation Error Response (400):**
```json
{
  "error": "File extension '.txt' not allowed. Allowed: jpg, jpeg, png, gif, bmp, webp, mp4, avi, mov, mkv"
}
```

## Validation Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Filename is required` | No filename provided | Provide a valid filename |
| `File must have an extension` | Filename has no extension | Add file extension (e.g., `.png`) |
| `File extension '.ext' not allowed` | Extension not in whitelist | Use allowed extension |
| `Content-Type is required` | No content type provided | Provide valid content type |
| `Content-Type 'type' not allowed` | Content type not in whitelist | Use allowed content type |
| `File size X.XXMb exceeds limit of YMB` | File too large | Reduce file size or increase limit |

## Implementation Details

### Files Modified
1. **src/config.js** - Added validation configuration
2. **src/server.js** - Updated presign endpoint with validation
3. **frontend/src/components/PresignUpload.jsx** - Updated to send fileSizeBytes

### Files Created
1. **src/validation.js** - Validation utility functions
2. **src/validation.test.js** - Test suite for validation logic

## Usage Examples

### Valid Request
```javascript
const res = await fetch('/api/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'manga_page_001.png',
    contentType: 'image/png',
    fileSizeBytes: 2048576  // 2MB
  })
});
const { key, url } = await res.json();
```

### Invalid Requests

**Invalid extension:**
```javascript
// Will return 400 error
body: JSON.stringify({
  filename: 'document.pdf',
  contentType: 'application/pdf',
  fileSizeBytes: 1024000
})
```

**File too large:**
```javascript
// Will return 400 error (assuming 100MB limit)
body: JSON.stringify({
  filename: 'video.mp4',
  contentType: 'video/mp4',
  fileSizeBytes: 150 * 1024 * 1024  // 150MB
})
```

## Testing

Run validation tests:
```bash
node src/validation.test.js
```

Expected output shows all validation scenarios passing/failing as expected.

## Environment Configuration

Add to `.env`:
```bash
# File validation limits
MAX_FILE_SIZE_MB=100
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,bmp,webp,mp4,avi,mov,mkv
ALLOWED_CONTENT_TYPES=image/jpeg,image/png,image/gif,image/bmp,image/webp,video/mp4,video/x-msvideo,video/quicktime,video/x-matroska

# Per-user upload quota
USER_UPLOAD_QUOTA_MB=500
QUOTA_WINDOW_HOURS=1
```

## Future Enhancements

1. **Per-user quota tracking**: Implement Redis-based quota tracking per user
2. **Virus scanning**: Integrate with ClamAV or similar for malware detection
3. **Image dimension validation**: Enforce min/max image dimensions
4. **Video codec validation**: Validate video codec compatibility
5. **Rate limiting**: Add rate limiting per IP/user
