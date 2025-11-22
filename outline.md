# MangaMotion AI - Project Outline

## File Structure
```
/mnt/okcomputer/output/
├── index.html              # Landing page (Home)
├── signup.html             # Sign up page
├── login.html              # Login page  
├── dashboard.html          # Creator dashboard
├── upload.html             # Upload screen
├── detection.html          # Panel detection review
├── editor.html             # Main editor interface
├── export.html             # Export screen
├── pricing.html            # Pricing page
├── main.js                 # Core JavaScript functionality
└── resources/              # Assets folder
    ├── hero-demo.mp4       # Demo video
    ├── manga-sample.jpg    # Sample manga page
    └── ui-icons/           # Interface icons
```

## Page Breakdown

### 1. Landing Page (index.html)
- Hero section with big title and CTA
- Demo preview video (autoplay)
- Core features grid (3 features)
- Use cases section
- Footer with navigation

### 2. Auth Pages (signup.html, login.html)
- Clean forms with email/password
- Google login integration
- No "continue without account" option

### 3. Dashboard (dashboard.html)
- Top bar with logo, new project, profile
- Project grid with thumbnails
- New project creation card

### 4. Upload Screen (upload.html)
- Large drag & drop zone
- File format support info
- Next button (disabled until upload)

### 5. Panel Detection (detection.html)
- Left: Page preview with detected panels
- Right: Panel order list (draggable)
- Edit/Regenerate/Continue buttons

### 6. Editor (editor.html)
- Left: Panels list thumbnails
- Center: Canvas preview with timeline
- Right: Motion, Audio, SFX controls
- Bottom: Timeline with tracks

### 7. Export Screen (export.html)
- Resolution options (720p/1080p/4K)
- Watermark toggle
- Share options (YouTube, Instagram)

### 8. Pricing Page (pricing.html)
- Three tiers: Free, Creator, Studio
- Feature comparison table
- Clear pricing display

## Interactive Components
- Drag & drop file upload
- Panel reordering with drag
- Timeline scrubber
- Motion style dropdown
- Voice emotion slider
- Export quality selector

## Visual Effects
- Anime.js animations
- Smooth transitions
- Hover effects on interactive elements
- Loading states
- Progress indicators