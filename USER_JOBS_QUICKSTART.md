# User Jobs Dashboard - Quick Start

## 5-Minute Setup

### 1. Database Migration

```bash
cd mangamotion/backend
npm run migrate
```

This adds the `user_id` column to the jobs table.

### 2. Start Backend

```bash
npm start
```

### 3. Test Endpoints

**Get user's jobs:**
```bash
curl -X GET "http://localhost:3000/api/me/jobs?page=1&limit=20" \
  -H "Authorization: Bearer {accessToken}"
```

**Get statistics:**
```bash
curl -X GET "http://localhost:3000/api/me/jobs/stats" \
  -H "Authorization: Bearer {accessToken}"
```

**Filter by status:**
```bash
curl -X GET "http://localhost:3000/api/me/jobs?status=completed" \
  -H "Authorization: Bearer {accessToken}"
```

**Search by prompt:**
```bash
curl -X GET "http://localhost:3000/api/me/jobs?search=anime" \
  -H "Authorization: Bearer {accessToken}"
```

**Delete a job:**
```bash
curl -X DELETE "http://localhost:3000/api/me/jobs/{jobId}" \
  -H "Authorization: Bearer {accessToken}"
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/me/jobs` | List user jobs (paginated) | Required |
| GET | `/api/me/jobs/stats` | Get job statistics | Required |
| GET | `/api/me/jobs/:jobId` | Get job details | Required |
| DELETE | `/api/me/jobs/:jobId` | Delete job | Required |

## Query Parameters

**GET /api/me/jobs:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter: completed, processing, queued, failed
- `search` - Search by prompt text

## Response Format

**List Jobs:**
```json
{
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "prompt": "turn this into anime",
      "status": "completed",
      "progress": 100,
      "createdAt": "2025-11-23T18:30:00.000Z",
      "updatedAt": "2025-11-23T18:35:00.000Z",
      "resultUrl": "https://minio.example.com/...",
      "thumbnailUrl": "https://minio.example.com/..."
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

**Statistics:**
```json
{
  "total": 45,
  "completed": 30,
  "processing": 5,
  "queued": 8,
  "failed": 2
}
```

## Frontend Integration

### Route Setup

```javascript
import Dashboard from './pages/Dashboard';

const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <Dashboard />
  }
]);
```

### Navigation

```javascript
// From other pages
navigate('/dashboard');

// From Dashboard to result
navigate(`/result/${jobId}`);
```

## Run Tests

```bash
npm test -- user-jobs.test.js
```

## Key Files

| File | Purpose |
|------|---------|
| `mangamotion/backend/src/routes/user-jobs.js` | Backend endpoints |
| `mangamotion/backend/src/routes/user-jobs.test.js` | Tests |
| `mangamotion/frontend/src/pages/Dashboard.jsx` | React component |

## Dashboard Features

✅ Job statistics cards
✅ Search by prompt
✅ Filter by status
✅ Thumbnail gallery
✅ Pagination
✅ Bulk delete
✅ Quick actions (View, Download, Regenerate)
✅ Responsive design
✅ Dark theme with Tailwind CSS

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" | Check access token is valid |
| Jobs not appearing | Verify jobs were created with auth |
| Search not working | Check prompt contains search text |
| Delete fails | Verify you own the job |

## Next Steps

1. Integrate Dashboard into main app navigation
2. Add user profile page
3. Implement Phase 5: Credit system
4. Add more filtering options
5. Implement job sharing

## Documentation

- Full docs: `USER_JOBS_DASHBOARD_README.md`
- Backend: `mangamotion/backend/src/routes/user-jobs.js`
- Frontend: `mangamotion/frontend/src/pages/Dashboard.jsx`
