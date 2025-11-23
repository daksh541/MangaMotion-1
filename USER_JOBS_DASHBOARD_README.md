# User Jobs Dashboard - Phase 4

## Overview

Phase 4 implements user-jobs relationship and a comprehensive dashboard for viewing, filtering, and managing job history. Users can see all their generated jobs with thumbnails, status, and quick actions.

## Features

### Backend Endpoints

#### GET /api/me/jobs
Retrieve paginated list of user's jobs with filtering and search.

**Query Parameters:**
- `page` (default: 1) - Page number for pagination
- `limit` (default: 20, max: 100) - Items per page
- `status` (optional) - Filter by status: completed, processing, queued, failed
- `search` (optional) - Search by prompt text

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "prompt": "turn this into anime, cinematic",
      "status": "completed",
      "progress": 100,
      "createdAt": "2025-11-23T18:30:00.000Z",
      "updatedAt": "2025-11-23T18:35:00.000Z",
      "resultUrl": "https://minio.example.com/outputs/.../video.mp4?token=xyz",
      "thumbnailUrl": "https://minio.example.com/outputs/.../thumb.jpg?token=xyz"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### GET /api/me/jobs/stats
Get job statistics for authenticated user.

**Response:**
```json
{
  "total": 45,
  "completed": 30,
  "processing": 5,
  "queued": 8,
  "failed": 2
}
```

#### GET /api/me/jobs/:jobId
Get specific job details (user must own the job).

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "filePath": null,
  "prompt": "turn this into anime, cinematic",
  "status": "completed",
  "progress": 100,
  "error": null,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:35:00.000Z",
  "resultUrl": "https://minio.example.com/outputs/.../video.mp4?token=xyz"
}
```

#### DELETE /api/me/jobs/:jobId
Delete a job (user must own the job).

**Response:**
```json
{
  "message": "Job deleted successfully"
}
```

### Frontend Components

#### Dashboard.jsx
Main dashboard component displaying user's job history.

**Features:**
- Job statistics cards (total, completed, processing, queued, failed)
- Search by prompt text
- Filter by status
- Thumbnail gallery with 1-3 column responsive layout
- Status badges with color coding
- Quick actions: View, Download, Regenerate
- Bulk delete with checkbox selection
- Pagination controls
- Loading and error states

**Route:** `/dashboard`

**Props:** None (uses React Router and localStorage for auth)

**State:**
- `jobs` - Array of job objects
- `loading` - Loading state
- `error` - Error message
- `stats` - Job statistics
- `page` - Current page number
- `limit` - Items per page
- `statusFilter` - Current status filter
- `searchQuery` - Current search query
- `selectedJobs` - Set of selected job IDs for bulk actions

**Key Methods:**
- `fetchJobs()` - Fetch paginated jobs with filters
- `fetchStats()` - Fetch job statistics
- `handleSearch()` - Update search query
- `handleStatusFilter()` - Update status filter
- `toggleJobSelection()` - Toggle job checkbox
- `handleBulkDelete()` - Delete selected jobs

### Database Changes

#### Jobs Table
Added `user_id` column to link jobs to users:

```sql
ALTER TABLE jobs ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
```

#### User-Jobs Relationship
- One user has many jobs
- Each job belongs to one user
- Foreign key: `jobs.user_id` → `users.id`

## API Integration

### Authentication
All endpoints require JWT access token in Authorization header:
```
Authorization: Bearer {accessToken}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid authorization header"
}
```

**403 Forbidden:**
```json
{
  "error": "forbidden",
  "message": "You do not own this job"
}
```

**404 Not Found:**
```json
{
  "error": "not_found",
  "message": "Job not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "internal_error",
  "message": "error details"
}
```

## Usage Examples

### JavaScript/React

```javascript
// Fetch user's jobs
const response = await fetch('/api/me/jobs?page=1&limit=20&status=completed', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { jobs, pagination } = await response.json();

// Get statistics
const statsRes = await fetch('/api/me/jobs/stats', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const stats = await statsRes.json();

// Delete a job
await fetch('/api/me/jobs/job-id', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### cURL

```bash
# Get jobs with filter
curl -X GET "http://localhost:3000/api/me/jobs?status=completed&limit=10" \
  -H "Authorization: Bearer {accessToken}"

# Get statistics
curl -X GET "http://localhost:3000/api/me/jobs/stats" \
  -H "Authorization: Bearer {accessToken}"

# Delete job
curl -X DELETE "http://localhost:3000/api/me/jobs/job-id" \
  -H "Authorization: Bearer {accessToken}"
```

## Dashboard UI Components

### Statistics Cards
Display counts for each status:
- Total jobs
- Completed jobs (green)
- Processing jobs (blue)
- Queued jobs (yellow)
- Failed jobs (red)

### Search Bar
- Real-time search by prompt text
- Resets pagination to page 1
- Debounced for performance

### Status Filter
- Dropdown to filter by status
- Options: All, Completed, Processing, Queued, Failed
- Resets pagination to page 1

### Job Cards
Each job displays:
- **Thumbnail:** Preview image or placeholder
- **Status Badge:** Color-coded status label
- **Progress Indicator:** For processing jobs
- **Prompt:** First 2 lines of prompt text
- **Date:** Creation date and time
- **Actions:**
  - View: Navigate to result page
  - Download: Open presigned URL in new tab
  - Regenerate: Pre-fill prompt for new job

### Bulk Actions
- Checkbox selection on each card
- Delete button appears when items selected
- Confirmation dialog before deletion

### Pagination
- Previous/Next buttons
- Current page display
- Disabled when at first/last page

## File Structure

### Backend
- `mangamotion/backend/src/routes/user-jobs.js` - Route handlers
- `mangamotion/backend/src/routes/user-jobs.test.js` - Tests

### Frontend
- `mangamotion/frontend/src/pages/Dashboard.jsx` - React component

### Database
- `mangamotion/backend/migrations/create_users.sql` - Updated with user_id column

## Testing

### Run Tests

```bash
cd mangamotion/backend
npm test -- user-jobs.test.js
```

### Test Coverage
- Pagination with custom page and limit
- Filtering by status
- Searching by prompt
- Sorting by created_at descending
- User isolation (only own jobs)
- Bulk delete operations
- Job deletion with ownership verification
- Statistics aggregation
- Error handling

### Manual Testing

```bash
# 1. Register user
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Create jobs
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"prompt":"test prompt 1"}'

# 3. View dashboard
# Navigate to http://localhost:3000/dashboard

# 4. Test filtering
# Click status filter dropdown
# Select "Completed"

# 5. Test search
# Type in search box
# Verify results update

# 6. Test bulk delete
# Check multiple jobs
# Click Delete button
# Confirm deletion
```

## Performance Considerations

### Database Queries
- Indexed on `user_id` for fast filtering
- Indexed on `status` for status filtering
- Indexed on `created_at` for sorting
- Pagination prevents loading all jobs at once

### Frontend Optimization
- Lazy loading of thumbnails
- Debounced search input
- Memoized components (optional)
- Efficient state management

### Presigned URLs
- Generated on-demand for security
- 1-hour expiry for performance
- Cached in component state during session

## Security Considerations

### Authorization
- All endpoints require JWT authentication
- User can only access their own jobs
- Ownership verified on delete and get operations

### Data Privacy
- Jobs filtered by user_id at database level
- Presigned URLs are short-lived (1 hour)
- No sensitive data in response

### Input Validation
- Page and limit parameters validated
- Status filter validated against allowed values
- Search query sanitized

## Future Enhancements

1. **Export Functionality:** Bulk download as ZIP
2. **Sharing:** Generate shareable links for jobs
3. **Favorites:** Mark jobs as favorites
4. **Sorting:** Sort by date, status, prompt
5. **Advanced Filters:** Date range, prompt keywords
6. **Batch Operations:** Batch regenerate, batch delete
7. **Analytics:** View trends and statistics
8. **Archiving:** Archive old jobs
9. **Collaboration:** Share jobs with other users
10. **Tagging:** Organize jobs with tags

## Troubleshooting

### "Unauthorized" Error
- Verify access token is valid
- Check token hasn't expired
- Refresh token if needed

### Jobs Not Appearing
- Verify user is logged in
- Check jobs were created with authenticated user
- Verify database has user_id set for jobs

### Search Not Working
- Check search query is not empty
- Verify prompt contains search text
- Check database has jobs with matching prompts

### Delete Not Working
- Verify you own the job
- Check job exists
- Verify access token is valid

## Related Components

- **ResultPage.jsx** - View individual job result
- **Auth System** - User authentication
- **Generate-from-Prompt** - Create new jobs

## Documentation Files

- `USER_JOBS_DASHBOARD_README.md` - This file
- `USER_JOBS_QUICKSTART.md` - Quick start guide

## Support

For issues or questions, refer to the main project README or contact the development team.
