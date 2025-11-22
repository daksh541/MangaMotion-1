/**
 * Unit Tests for File Validation
 * 
 * Tests validation functions:
 * - validateExtension
 * - validateContentType
 * - validateFileSize
 * - validatePresignRequest
 */

const {
  validateExtension,
  validateContentType,
  validateFileSize,
  validatePresignRequest
} = require('./validation');

describe('File Validation', () => {
  describe('validateExtension', () => {
    test('should accept valid image extensions', () => {
      const validImages = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      
      validImages.forEach(ext => {
        const result = validateExtension(`image.${ext}`);
        expect(result.valid).toBe(true);
      });
    });

    test('should accept valid video extensions', () => {
      const validVideos = ['mp4', 'avi', 'mov', 'mkv'];
      
      validVideos.forEach(ext => {
        const result = validateExtension(`video.${ext}`);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid extensions', () => {
      const invalidExts = ['txt', 'pdf', 'doc', 'exe', 'zip'];
      
      invalidExts.forEach(ext => {
        const result = validateExtension(`file.${ext}`);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should reject files without extension', () => {
      const result = validateExtension('noextension');
      expect(result.valid).toBe(false);
    });

    test('should reject empty filename', () => {
      const result = validateExtension('');
      expect(result.valid).toBe(false);
    });

    test('should be case insensitive', () => {
      const result1 = validateExtension('image.JPG');
      const result2 = validateExtension('image.Jpg');
      const result3 = validateExtension('image.jpg');
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
    });

    test('should handle multiple dots in filename', () => {
      const result = validateExtension('my.image.file.jpg');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateContentType', () => {
    test('should accept valid image content types', () => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp'
      ];
      
      validTypes.forEach(type => {
        const result = validateContentType(type);
        expect(result.valid).toBe(true);
      });
    });

    test('should accept valid video content types', () => {
      const validTypes = [
        'video/mp4',
        'video/x-msvideo',
        'video/quicktime',
        'video/x-matroska'
      ];
      
      validTypes.forEach(type => {
        const result = validateContentType(type);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid content types', () => {
      const invalidTypes = [
        'application/pdf',
        'text/plain',
        'application/zip',
        'application/x-executable'
      ];
      
      invalidTypes.forEach(type => {
        const result = validateContentType(type);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should accept content type with charset', () => {
      const result = validateContentType('image/jpeg; charset=utf-8');
      expect(result.valid).toBe(true);
    });

    test('should reject empty content type', () => {
      const result = validateContentType('');
      expect(result.valid).toBe(false);
    });

    test('should be case insensitive', () => {
      const result1 = validateContentType('IMAGE/JPEG');
      const result2 = validateContentType('Image/Jpeg');
      const result3 = validateContentType('image/jpeg');
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    test('should accept files under 100MB', () => {
      const sizes = [
        1 * 1024 * 1024,      // 1MB
        10 * 1024 * 1024,     // 10MB
        50 * 1024 * 1024,     // 50MB
        99 * 1024 * 1024      // 99MB
      ];
      
      sizes.forEach(size => {
        const result = validateFileSize(size);
        expect(result.valid).toBe(true);
      });
    });

    test('should accept exactly 100MB', () => {
      const result = validateFileSize(100 * 1024 * 1024);
      expect(result.valid).toBe(true);
    });

    test('should reject files over 100MB', () => {
      const sizes = [
        101 * 1024 * 1024,    // 101MB
        150 * 1024 * 1024,    // 150MB
        200 * 1024 * 1024     // 200MB
      ];
      
      sizes.forEach(size => {
        const result = validateFileSize(size);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should accept zero bytes', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(true);
    });

    test('should reject undefined size', () => {
      const result = validateFileSize(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject null size', () => {
      const result = validateFileSize(null);
      expect(result.valid).toBe(false);
    });

    test('should reject negative size', () => {
      const result = validateFileSize(-1024);
      expect(result.valid).toBe(false);
    });

    test('should reject non-numeric size', () => {
      const result = validateFileSize('1024');
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePresignRequest', () => {
    test('should accept valid presign request', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'image/jpeg',
        50 * 1024 * 1024
      );
      expect(result.valid).toBe(true);
    });

    test('should reject with invalid extension', () => {
      const result = validatePresignRequest(
        'document.txt',
        'text/plain',
        1024000
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('extension');
    });

    test('should reject with invalid content type', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'application/pdf',
        1024000
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('content type');
    });

    test('should reject with file too large', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'image/jpeg',
        200 * 1024 * 1024
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    test('should reject with missing filename', () => {
      const result = validatePresignRequest(
        '',
        'image/jpeg',
        1024000
      );
      expect(result.valid).toBe(false);
    });

    test('should reject with missing content type', () => {
      const result = validatePresignRequest(
        'image.jpg',
        '',
        1024000
      );
      expect(result.valid).toBe(false);
    });

    test('should reject with missing file size', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'image/jpeg',
        undefined
      );
      expect(result.valid).toBe(false);
    });

    test('should validate all fields independently', () => {
      // Invalid extension but valid content type and size
      const result1 = validatePresignRequest(
        'file.txt',
        'image/jpeg',
        1024000
      );
      expect(result1.valid).toBe(false);

      // Valid extension but invalid content type
      const result2 = validatePresignRequest(
        'file.jpg',
        'text/plain',
        1024000
      );
      expect(result2.valid).toBe(false);

      // Valid extension and content type but invalid size
      const result3 = validatePresignRequest(
        'file.jpg',
        'image/jpeg',
        200 * 1024 * 1024
      );
      expect(result3.valid).toBe(false);
    });

    test('should accept various valid combinations', () => {
      const validCombinations = [
        { filename: 'photo.jpg', contentType: 'image/jpeg', size: 1024000 },
        { filename: 'image.png', contentType: 'image/png', size: 2048000 },
        { filename: 'video.mp4', contentType: 'video/mp4', size: 50 * 1024 * 1024 },
        { filename: 'animation.gif', contentType: 'image/gif', size: 5 * 1024 * 1024 }
      ];

      validCombinations.forEach(combo => {
        const result = validatePresignRequest(
          combo.filename,
          combo.contentType,
          combo.size
        );
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in filename', () => {
      const result = validatePresignRequest(
        'image-2024_01_15.jpg',
        'image/jpeg',
        1024000
      );
      expect(result.valid).toBe(true);
    });

    test('should handle unicode characters in filename', () => {
      const result = validatePresignRequest(
        'image-日本語.jpg',
        'image/jpeg',
        1024000
      );
      expect(result.valid).toBe(true);
    });

    test('should handle very long filename', () => {
      const longName = 'a'.repeat(200) + '.jpg';
      const result = validatePresignRequest(
        longName,
        'image/jpeg',
        1024000
      );
      expect(result.valid).toBe(true);
    });

    test('should handle boundary file size (100MB)', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'image/jpeg',
        100 * 1024 * 1024
      );
      expect(result.valid).toBe(true);
    });

    test('should handle boundary file size (100MB + 1 byte)', () => {
      const result = validatePresignRequest(
        'image.jpg',
        'image/jpeg',
        100 * 1024 * 1024 + 1
      );
      expect(result.valid).toBe(false);
    });
  });
});
