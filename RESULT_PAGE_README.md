# Result Page Component

## Overview

The `ResultPage` component displays the result of a completed job with a video player, metadata, and options to download or regenerate. It polls the backend for job status updates and provides a real-time progress view.

## Features

- **Video Player:** Embedded video player with presigned MinIO URL
- **Real-time Status:** Polls `/api/status/:jobId` every 2 seconds
- **Progress Tracking:** Shows progress bar for processing jobs
- **Metadata Display:** Shows prompt, timestamps, status, and job ID
- **Download:** Opens presigned URL in new tab
- **Regenerate:** Modal to edit prompt and create new job
- **Error Handling:** Clear error messages for failed jobs
- **Responsive Design:** Mobile-friendly layout with Tailwind CSS

## Component Props

This is a route component that uses React Router's `useParams` hook:

```javascript
const { jobId } = useParams();
```

## Usage

### Route Setup

Add to your React Router configuration:

```javascript
import ResultPage from './pages/ResultPage';

const router = createBrowserRouter([
  {
    path: '/result/:jobId',
    element: <ResultPage />
  }
]);
```

### Navigation

Navigate to result page after creating a job:

```javascript
const response = await fetch('/api/generate-from-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'turn this into anime' })
});

const { jobId } = await response.json();
navigate(`/result/${jobId}`);
```

## Component States

### Loading State
- Shows spinner and "Loading job details..." message
- Triggered on initial page load

### Queued State
- Shows "Queued for processing..." message
- Displays yellow badge
- No video player

### Processing State
- Shows progress bar (0-100%)
- Displays current progress percentage
- Shows spinner animation
- Continues polling

### Completed State
- Shows video player with presigned URL
- Displays green "Completed" badge
- Shows Download and Regenerate buttons
- Stops polling

### Failed State
- Shows error message from backend
- Displays red "Failed" badge
- Shows "Try Again" button
- Stops polling

### Error State
- Shows error alert with details
- Displays "Back to Home" button
- Triggered by network errors or HTTP failures

## API Integration

### GET /api/status/:jobId

Fetches job status and metadata.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "error": null,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:35:00.000Z",
  "resultUrl": "https://minio.example.com/outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4?..."
}
```

### POST /api/generate-from-prompt

Called when user clicks "Regenerate" button.

**Request:**
```json
{
  "prompt": "new prompt text",
  "seed": 42
}
```

**Response:**
```json
{
  "jobId": "new-job-id"
}
```

## Styling

Uses Tailwind CSS with a dark theme:

- **Background:** Gradient from slate-900 to purple-900
- **Accent Colors:** Purple, pink, blue, green
- **Text:** White on dark backgrounds
- **Borders:** Purple with low opacity
- **Hover Effects:** Scale and color transitions

## Polling Behavior

- **Interval:** 2 seconds
- **Start:** On component mount
- **Stop:** When job status is 'completed' or 'failed'
- **Cleanup:** Interval cleared on component unmount

## Error Handling

### Network Errors
```javascript
try {
  const response = await fetch(`/api/status/${jobId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // ...
} catch (err) {
  setError(`Failed to fetch job status: ${err.message}`);
}
```

### Regeneration Errors
```javascript
if (!regeneratePrompt.trim()) {
  setError('Prompt cannot be empty');
  return;
}
```

## Accessibility

- Semantic HTML elements
- ARIA labels on buttons
- Keyboard navigation support
- Color contrast meets WCAG AA standards
- Loading states clearly communicated

## Performance Optimizations

- Polling stops when job completes
- Interval cleanup on unmount
- Efficient re-renders with React hooks
- Presigned URLs cached in component state

## Testing

Run tests with:

```bash
npm test -- ResultPage.test.jsx
```

**Test Coverage:**
- Loading state
- Completed job display
- Processing job display with progress updates
- Failed job display
- Queued job display
- Download functionality
- Regenerate modal interaction
- Error handling
- Status badge colors
- Polling behavior

## File Structure

```
mangamotion/frontend/src/pages/
├── ResultPage.jsx           # Component
├── ResultPage.test.jsx      # Tests
└── ...
```

## Dependencies

- React 18+
- React Router 6+
- Lucide React (icons)
- Tailwind CSS

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations

1. **Presigned URL Expiry:** URLs expire after 1 hour. Refresh page to get new URL.
2. **Polling Interval:** Fixed at 2 seconds. Consider adaptive polling for production.
3. **Video Codec Support:** Depends on browser support for H.264 video codec.
4. **Large Files:** Video player may struggle with files > 500MB.

## Future Enhancements

1. **Adaptive Polling:** Increase interval as job progresses
2. **WebSocket Support:** Real-time updates via WebSocket instead of polling
3. **Thumbnail Gallery:** Display keyframe thumbnails
4. **Share Functionality:** Generate shareable links
5. **Batch Operations:** Select multiple jobs for bulk actions
6. **Advanced Filters:** Filter by status, date, prompt keywords
7. **Download Options:** Choose format (MP4, WebM, GIF)
8. **Comparison View:** Compare original and result side-by-side

## Troubleshooting

### Video Not Playing
- Check browser supports H.264 codec
- Verify presigned URL is valid
- Check MinIO is accessible
- Try refreshing page to get new presigned URL

### Stuck on Processing
- Check worker is running
- Verify RabbitMQ has messages
- Check worker logs for errors
- Manually update job status in DB if needed

### Regenerate Not Working
- Verify `/api/generate-from-prompt` endpoint is running
- Check prompt is non-empty
- Look for error messages in console
- Verify RabbitMQ is accessible

### Timestamps Not Displaying
- Check ISO 8601 format in backend response
- Verify browser timezone settings
- Check JavaScript Date parsing

## Security Considerations

1. **Presigned URLs:** Short-lived (1 hour), regenerated on each status check
2. **CORS:** Configure CORS headers for MinIO access
3. **Authentication:** Optional userId parameter for tracking
4. **Input Validation:** Prompt validated on backend before processing

## Performance Metrics

- **Initial Load:** < 500ms
- **Status Poll:** < 100ms
- **Video Load:** Depends on file size and network
- **Regenerate Request:** < 200ms

## Related Components

- `AnimeGenerator.tsx` - Initial job creation
- `Dashboard.jsx` - Job history and gallery
- `UploadEnqueue.jsx` - File upload alternative

## Support

For issues or questions, refer to the main project README or contact the development team.
