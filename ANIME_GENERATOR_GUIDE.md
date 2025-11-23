# Anime Generator Interface - Design & Implementation Guide

## Overview

A sleek, modern anime-generation interface built with React, TypeScript, and Tailwind CSS. Features a premium dark theme with neon accents, smooth animations, and an intuitive dual-input system for text prompts and image uploads.

## Component Structure

### Main Component: `AnimeGenerator.tsx`

Located at: `/components/AnimeGenerator.tsx`

#### Key Features

1. **Header Section**
   - Bold, gradient-text title: "Create Anime From Prompt or Images"
   - Decorative icons (Sparkles, Zap) for visual appeal
   - Descriptive subtitle

2. **Dual Input System**

   **Left Side - Prompt Input:**
   - Large textarea for detailed anime scene descriptions
   - Hover gradient glow effect
   - Helpful tip text for prompt optimization
   - Smooth focus animations with neon border

   **Right Side - Image Upload:**
   - Drag-and-drop support for PNG/JPG images
   - Click-to-browse fallback
   - Max 5 images per generation
   - Image preview grid with hover delete buttons
   - Visual feedback for drag-active state

3. **Generate Button**
   - Prominent gradient button with glow effect
   - Disabled state when prompt is empty
   - Loading state with spinner animation
   - Smooth hover and active animations

4. **Processing State UI**
   - Real-time progress indicator
   - Animated progress bar
   - Status message with visual feedback

5. **Results Gallery**
   - Responsive grid layout (1-4 columns based on screen size)
   - Individual frame cards with:
     - Image preview with zoom on hover
     - Download and share buttons
     - Delete functionality
     - Status indicator (checkmark)
   - Frame counter

6. **Modal Viewer**
   - Full-screen modal for selected frames
   - Displays original prompt
   - Download and share actions
   - Smooth backdrop blur

#### Design System

**Color Palette:**
- Primary: Purple (`#a855f7`)
- Secondary: Blue (`#3b82f6`)
- Accent: Pink (`#ec4899`)
- Background: Dark (`#0F1419`, `#1a1f2e`, `#0a0d11`)
- Text: White with gray accents

**Typography:**
- Headers: Bold, gradient text
- Body: Regular weight, gray-400 for secondary text
- Labels: Semibold, white

**Effects:**
- Gradient overlays on hover
- Soft shadows with blur
- Neon glow effects
- Smooth transitions (300ms default)
- Animated background gradients
- Backdrop blur (12px)

**Spacing:**
- Padding: 8px, 12px, 16px, 24px, 32px
- Gap: 8px, 12px, 16px, 24px
- Border radius: 12px, 16px, 24px

## Component Props

```typescript
interface AnimeGeneratorProps {
  onGenerate?: (prompt: string, images: File[]) => Promise<void>;
}
```

- `onGenerate`: Optional callback function triggered when user clicks "Generate Anime"
  - Receives prompt text and array of uploaded files
  - Should return a Promise that resolves when generation completes
  - If not provided, component uses demo mode with simulated generation

## State Management

```typescript
interface GeneratedFrame {
  id: string;
  src: string;
  timestamp: number;
  prompt: string;
}
```

**Component States:**
- `prompt`: Current text in prompt input
- `uploadedImages`: Array of File objects from upload
- `isGenerating`: Boolean flag for loading state
- `generatedFrames`: Array of generated frame objects
- `dragActive`: Boolean for drag-and-drop visual feedback
- `selectedFrame`: Currently selected frame for modal view

## Usage Example

### Basic Implementation

```tsx
import AnimeGenerator from '@/components/AnimeGenerator';

export default function Page() {
  return <AnimeGenerator />;
}
```

### With Custom Generation Handler

```tsx
import AnimeGenerator from '@/components/AnimeGenerator';

export default function Page() {
  const handleGenerate = async (prompt: string, images: File[]) => {
    const formData = new FormData();
    formData.append('prompt', prompt);
    images.forEach((img, i) => formData.append(`image_${i}`, img));
    
    const response = await fetch('/api/generate-anime', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    // Handle response...
  };

  return <AnimeGenerator onGenerate={handleGenerate} />;
}
```

## Responsive Design

- **Mobile (< 768px)**: Single column layout, stacked inputs
- **Tablet (768px - 1024px)**: Two column layout with adjusted spacing
- **Desktop (> 1024px)**: Full dual-column layout with 4-column gallery grid

## Accessibility Features

- Semantic HTML with proper labels
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus states with visible rings
- Color contrast compliance
- Screen reader friendly

## Dependencies

- **React**: ^18.0.0
- **TypeScript**: ^5.0.0
- **Tailwind CSS**: ^3.0.0
- **Lucide React**: ^0.263.0 (for icons)

## Icon Library

Uses Lucide React icons:
- `Upload`: Image upload section
- `Sparkles`: Header decoration
- `Zap`: Generate button and header
- `Grid3x3`: Gallery section header
- `Loader`: Loading spinner
- `CheckCircle`: Frame status
- `AlertCircle`: Empty state
- `X`: Close/delete buttons
- `Download`: Download action
- `Share2`: Share action

## Animation Details

**Hover Effects:**
- Gradient glow appears on input containers
- Image zoom (110% scale) on gallery hover
- Button shadow expansion
- Icon color transitions

**Loading State:**
- Spinner rotation animation
- Progress bar pulse
- Dot pulse indicator

**Transitions:**
- Default: 300ms ease
- Fast: 200ms ease
- Slow: 500ms ease

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android latest

## Performance Considerations

1. **Image Handling**
   - Uses `URL.createObjectURL()` for preview generation
   - Limits to 5 images maximum
   - Cleans up object URLs on unmount

2. **Rendering**
   - Memoization for gallery items (if needed)
   - Efficient state updates
   - Debounced drag handlers

3. **File Size**
   - Component size: ~12KB (minified)
   - No external API calls in demo mode

## Customization Guide

### Changing Colors

Edit the gradient colors in className strings:
```tsx
// Change primary gradient
from-purple-400 via-blue-400 to-pink-400
// To:
from-cyan-400 via-blue-400 to-purple-400
```

### Adjusting Layout

Modify grid columns:
```tsx
// Change gallery columns
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
// To:
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

### Customizing Upload Limits

```tsx
// In handleDrop and handleFileSelect
.slice(0, 5)  // Change 5 to desired limit
```

### Modifying Animation Speed

```tsx
// Change transition duration
duration-300  // Change to duration-200 or duration-500
```

## Demo Page

Located at: `/pages/anime-generator-demo.tsx`

Provides a full-page demo with:
- Sample generation handler
- Console logging for debugging
- Full component showcase

## Integration Checklist

- [ ] Install dependencies: `npm install lucide-react`
- [ ] Copy component to `/components/AnimeGenerator.tsx`
- [ ] Ensure Tailwind CSS is configured
- [ ] Import and use in your page
- [ ] Implement `onGenerate` callback with your API
- [ ] Test drag-and-drop functionality
- [ ] Verify responsive layout on mobile
- [ ] Test accessibility with keyboard navigation

## Known Limitations

1. Demo mode uses placeholder images from Unsplash
2. File size validation not implemented (add if needed)
3. No image compression before upload
4. Gallery doesn't persist between page refreshes
5. No undo/redo functionality

## Future Enhancements

- [ ] Image compression before upload
- [ ] File size validation
- [ ] Batch generation
- [ ] Generation history/favorites
- [ ] Export as video/GIF
- [ ] Real-time preview
- [ ] Advanced prompt suggestions
- [ ] Generation templates

## Troubleshooting

**Issue: Icons not showing**
- Solution: Ensure `lucide-react` is installed: `npm install lucide-react`

**Issue: Styles not applying**
- Solution: Verify Tailwind CSS is properly configured in your project

**Issue: Drag-and-drop not working**
- Solution: Check browser console for errors, ensure file types are PNG/JPG

**Issue: Modal not closing**
- Solution: Verify click handlers are properly attached

## License

MIT - Part of MangaMotion project
