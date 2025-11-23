# Anime Generator - Integration Guide

## Overview
This guide shows how to integrate the Anime Generator component into your application and connect it with your backend API.

## Installation

### Prerequisites
- React 18 or higher
- Tailwind CSS 3 or higher
- Lucide React for icons

### Setup

1. **Ensure dependencies are installed:**
```bash
npm install react lucide-react
npm install -D tailwindcss
```

2. **Copy the component:**
```bash
# Component is already at:
/components/AnimeGenerator.tsx
```

3. **Ensure Tailwind CSS is configured:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Basic Integration

### Minimal Setup
```typescript
import AnimeGenerator from '@/components/AnimeGenerator';

export default function GeneratorPage() {
  return <AnimeGenerator />;
}
```

This will show the UI with mock data generation (no backend required).

## With Backend Integration

### Step 1: Create API Handler
```typescript
// lib/anime-api.ts
export async function generateAnime(
  prompt: string,
  images: File[]
): Promise<GeneratedFrame[]> {
  const formData = new FormData();
  formData.append('prompt', prompt);
  
  images.forEach((image, index) => {
    formData.append(`images`, image);
  });

  const response = await fetch('/api/generate-anime', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to generate anime');
  }

  return response.json();
}
```

### Step 2: Create Page Component
```typescript
// pages/generator.tsx
import { useState } from 'react';
import AnimeGenerator from '@/components/AnimeGenerator';
import { generateAnime } from '@/lib/anime-api';

export default function GeneratorPage() {
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (prompt: string, images: File[]) => {
    try {
      setError(null);
      await generateAnime(prompt, images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      throw err;
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      <AnimeGenerator onGenerate={handleGenerate} />
    </div>
  );
}
```

### Step 3: Create Backend Endpoint
```typescript
// pages/api/generate-anime.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await form.parse(req);

    const prompt = Array.isArray(fields.prompt) 
      ? fields.prompt[0] 
      : fields.prompt;

    const imageFiles = Array.isArray(files.images)
      ? files.images
      : files.images ? [files.images] : [];

    // Call your AI service here
    const generatedFrames = await callAIService(prompt, imageFiles);

    res.status(200).json(generatedFrames);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
}

async function callAIService(prompt: string, images: any[]) {
  // Implement your AI service call here
  // Example: call OpenAI, Stability AI, or your custom model
  
  return [
    {
      id: `frame-${Date.now()}-0`,
      src: 'generated-image-url',
      timestamp: Date.now(),
      prompt: prompt,
    },
  ];
}
```

## Advanced Integration

### With Loading State Management
```typescript
import { useState } from 'react';
import AnimeGenerator from '@/components/AnimeGenerator';

export default function GeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleGenerate = async (prompt: string, images: File[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-anime', {
        method: 'POST',
        body: createFormData(prompt, images),
      });

      const data = await response.json();
      setResults(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <AnimeGenerator onGenerate={handleGenerate} />
      {isLoading && <LoadingIndicator />}
      {results.length > 0 && <ResultsDisplay results={results} />}
    </div>
  );
}

function createFormData(prompt: string, images: File[]) {
  const formData = new FormData();
  formData.append('prompt', prompt);
  images.forEach((img) => formData.append('images', img));
  return formData;
}
```

### With Error Boundary
```typescript
import { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg">
          <h2 className="font-bold mb-2">Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <AnimeGenerator onGenerate={handleGenerate} />
</ErrorBoundary>
```

## Customization

### Custom Styling
```typescript
// Create a wrapper with custom styles
export default function CustomGenerator() {
  return (
    <div className="custom-generator-wrapper">
      <AnimeGenerator />
    </div>
  );
}

// In your CSS
.custom-generator-wrapper {
  --primary-color: #a855f7;
  --secondary-color: #3b82f6;
}
```

### Custom Callbacks
```typescript
const handleGenerate = async (prompt: string, images: File[]) => {
  // Log the request
  console.log('Generating anime:', { prompt, imageCount: images.length });

  // Validate input
  if (prompt.length < 10) {
    throw new Error('Prompt must be at least 10 characters');
  }

  // Call API
  const response = await fetch('/api/generate-anime', {
    method: 'POST',
    body: createFormData(prompt, images),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  // Process results
  const data = await response.json();
  console.log('Generation complete:', data);

  return data;
};
```

## File Upload Handling

### Client-Side Validation
```typescript
const validateImages = (files: File[]): boolean => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

  return files.every(file => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error(`Invalid file type: ${file.type}`);
      return false;
    }
    if (file.size > MAX_SIZE) {
      console.error(`File too large: ${file.name}`);
      return false;
    }
    return true;
  });
};
```

### Server-Side Validation
```typescript
import sharp from 'sharp';

async function validateAndProcessImage(file: File) {
  const buffer = await file.arrayBuffer();
  
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Validate dimensions
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }
    
    // Resize if needed
    const resized = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    return resized;
  } catch (error) {
    throw new Error('Image processing failed');
  }
}
```

## API Response Format

### Expected Response
```typescript
interface GeneratedFrame {
  id: string;           // Unique identifier
  src: string;          // Image URL
  timestamp: number;    // Creation timestamp
  prompt: string;       // Original prompt
}

// Example response
[
  {
    id: "frame-1234567890-0",
    src: "https://cdn.example.com/generated/image-1.jpg",
    timestamp: 1234567890,
    prompt: "A serene Japanese garden at sunset..."
  },
  {
    id: "frame-1234567890-1",
    src: "https://cdn.example.com/generated/image-2.jpg",
    timestamp: 1234567891,
    prompt: "A serene Japanese garden at sunset..."
  }
]
```

## Performance Optimization

### Image Lazy Loading
```typescript
// In your API response, use lazy-loading URLs
const imageUrl = `https://cdn.example.com/generated/${id}.jpg?lazy=true`;
```

### Caching
```typescript
const cache = new Map<string, any>();

const handleGenerate = async (prompt: string, images: File[]) => {
  const cacheKey = `${prompt}-${images.length}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await generateAnime(prompt, images);
  cache.set(cacheKey, result);
  
  return result;
};
```

## Testing

### Unit Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import AnimeGenerator from '@/components/AnimeGenerator';

describe('AnimeGenerator', () => {
  it('renders the component', () => {
    render(<AnimeGenerator />);
    expect(screen.getByText(/Create Anime From Prompt or Images/i)).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const { getByLabelText } = render(<AnimeGenerator />);
    const input = getByLabelText(/Upload reference images/i) as HTMLInputElement;
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(input.files?.length).toBe(1);
  });

  it('calls onGenerate when button is clicked', async () => {
    const mockGenerate = jest.fn();
    render(<AnimeGenerator onGenerate={mockGenerate} />);
    
    const textarea = screen.getByPlaceholderText(/Describe your anime scene/i);
    fireEvent.change(textarea, { target: { value: 'Test prompt' } });
    
    const button = screen.getByText(/Generate Anime/i);
    fireEvent.click(button);
    
    expect(mockGenerate).toHaveBeenCalled();
  });
});
```

## Deployment

### Vercel
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
ANIME_API_KEY=your-api-key
```

## Troubleshooting

### Issue: Images not uploading
- Check file size limits
- Verify MIME types
- Check browser console for errors

### Issue: Generation timeout
- Increase timeout duration
- Check backend API status
- Verify network connectivity

### Issue: Styling not applied
- Ensure Tailwind CSS is configured
- Check CSS import order
- Verify class names are correct

## Support Resources

- **Component Documentation:** `/ANIME_GENERATOR_COMPLETE.md`
- **Quick Reference:** `/ANIME_GENERATOR_QUICK_REFERENCE.md`
- **Example Page:** `/pages/anime-generator-demo.tsx`
- **Standalone Demo:** `/anime-generator.html`

---

**Last Updated:** 2024
**Version:** 1.0.0
