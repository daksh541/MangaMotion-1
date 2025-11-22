# Image Uploader Component

A comprehensive React component for handling image uploads with drag & drop, preview thumbnails, reordering, cropping, and S3 uploads with progress tracking.

## Features

- **Drag & Drop**: Intuitive file upload with drag and drop support
- **File Preview**: Thumbnail previews of uploaded images
- **Reordering**: Drag and drop to reorder images
- **Crop Functionality**: Built-in image cropping (UI only, requires implementation)
- **Upload to S3**: Uploads to S3 using presigned URLs with progress tracking
- **Error Handling**: Robust error handling and retry mechanism
- **Responsive**: Works on all screen sizes

## Installation

1. First, install the required dependencies:

```bash
npm install react-dropzone react-beautiful-dnd uuid @types/uuid
```

2. For TypeScript support, also install:

```bash
npm install --save-dev @types/react @types/react-dom @types/node
```

## Usage

```tsx
import ImageUploader from './ImageUploader';

function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upload Your Images</h1>
      <ImageUploader />
    </div>
  );
}

export default App;
```

## Backend API Requirements

The component expects a backend endpoint that can generate presigned S3 URLs. Here's an example implementation using Node.js with Express:

```typescript
// Example API endpoint for generating presigned URLs
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import express from 'express';

const app = express();
app.use(express.json());

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

app.post('/api/upload/presigned-url', async (req, res) => {
  try {
    const { filename, fileType } = req.body;
    
    const key = `uploads/${Date.now()}-${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      fields: {},
      fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Environment Variables

Create a `.env` file in your frontend root with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Customization

You can customize the component by passing the following props (all optional):

- `maxSize`: Maximum file size in bytes (default: 10MB)
- `acceptedFileTypes`: Object specifying accepted file types (default: `{ 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }`)
- `onUploadSuccess`: Callback function when all files are uploaded successfully
- `onUploadError`: Callback function when an error occurs during upload

## Notes

- The cropping functionality requires additional implementation with a library like `react-image-crop`.
- For production use, make sure to implement proper error handling and validation on both client and server sides.
- The component includes basic styling with Tailwind CSS. Make sure to have Tailwind set up in your project or adjust the classes accordingly.
