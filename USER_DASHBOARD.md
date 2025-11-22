# User Dashboard Guide

Complete guide for the user-facing job dashboard and billing interface.

## Table of Contents

1. [Overview](#overview)
2. [Job Dashboard](#job-dashboard)
3. [Billing Dashboard](#billing-dashboard)
4. [Features](#features)
5. [API Integration](#api-integration)
6. [Customization](#customization)

## Overview

The user dashboard provides a comprehensive interface for:

- **Job Management**: View, track, and download job results
- **Usage Analytics**: Monitor data processing and compute time
- **Billing**: Track costs and usage trends
- **Downloads**: Access processed results with presigned URLs

## Job Dashboard

### Features

#### Job List View

- **Status Indicators**: Visual status badges (pending, processing, completed, failed)
- **Progress Bars**: Real-time progress for processing jobs
- **File Information**: File count, total size, upload date
- **Quick Actions**: View details, download, retry

#### Job Filtering

```
Filter by Status:
- All (default)
- Completed
- Processing
- Failed
```

#### Job Details Modal

- **Job ID**: Unique identifier
- **Status**: Current job state
- **Files**: Number of files processed
- **Size**: Total data size
- **Timestamps**: Created and completed times
- **Thumbnail Preview**: Visual preview of result
- **Download Button**: Presigned download link
- **Error Details**: Error message if failed

### UI Components

```jsx
// JobDashboard.jsx
<JobDashboard />

// Features:
// - Auto-refresh every 5 seconds
// - Responsive grid layout
// - Modal detail view
// - Status filtering
// - Error handling
```

### Status Indicators

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Completed | Green (#10b981) | ✓ | Job finished successfully |
| Processing | Blue (#3b82f6) | ⟳ | Job currently running |
| Failed | Red (#ef4444) | ✕ | Job encountered error |
| Pending | Amber (#f59e0b) | ⧖ | Job waiting to start |

### Styling

```css
/* JobDashboard.module.css */
- Modern card-based layout
- Responsive grid (auto-fill, minmax 300px)
- Smooth transitions and hover effects
- Mobile-optimized (single column on small screens)
- Accessibility-friendly (semantic HTML, ARIA labels)
```

## Billing Dashboard

### Features

#### Summary Cards

- **Total Bytes Processed**: Cumulative data processed
- **Compute Time**: Total processing time
- **Jobs Processed**: Count of completed jobs
- **Estimated Cost**: Calculated billing amount

#### Daily Usage Table

- **Date**: Day of usage
- **Bytes**: Data processed that day
- **Compute**: Processing time that day
- **Jobs**: Number of jobs completed
- **Trend**: Visual indicators for trends

#### Date Range Selection

```
Quick Select:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range
```

### UI Components

```jsx
// BillingDashboard.jsx
<BillingDashboard />

// Features:
// - Real-time data refresh
// - Date range filtering
// - Responsive table layout
// - Cost breakdown
// - Pricing information display
```

### Pricing Display

```
Data Processing:  $0.001 per GB
Compute Time:     $0.0001 per second
                  = $0.36 per hour

Note: Pricing subject to change. Contact support for volume discounts.
```

## Features

### Real-Time Updates

Jobs dashboard auto-refreshes every 5 seconds:

```javascript
useEffect(() => {
  fetchJobs();
  const interval = setInterval(fetchJobs, 5000);
  return () => clearInterval(interval);
}, []);
```

### Presigned Downloads

Download links are generated on-demand with expiration:

```
GET /api/jobs/{jobId}/download

Response:
{
  "job_id": "job-abc123",
  "download_url": "https://minio.example.com/processed/job-abc123/result.zip?...",
  "expires_in": 3600,
  "content_type": "application/zip"
}
```

### Thumbnail Preview

Thumbnails are displayed in job details modal:

```
GET /api/jobs/{jobId}/thumbnail

Response:
{
  "job_id": "job-abc123",
  "thumbnail_url": "https://minio.example.com/processed/job-abc123/thumb.jpg?...",
  "expires_in": 3600,
  "content_type": "image/jpeg"
}
```

### Error Handling

- **Network Errors**: Graceful error messages with retry option
- **Not Found**: 404 handling with helpful message
- **Unauthorized**: Redirect to login if needed
- **Server Errors**: Detailed error information for debugging

## API Integration

### Job Endpoints

```
GET /api/jobs
  Query: user_id, limit, offset
  Returns: {jobs: [], total, limit, offset}

GET /api/jobs/{jobId}
  Returns: {id, status, progress, data, ...}

GET /api/jobs/{jobId}/download
  Returns: {download_url, expires_in, content_type}

GET /api/jobs/{jobId}/thumbnail
  Returns: {thumbnail_url, expires_in, content_type}
```

### Billing Endpoints

```
GET /api/billing/summary
  Query: user_id
  Returns: {bytes_processed, compute_seconds, job_count, estimated_cost, ...}

GET /api/billing/daily-usage
  Query: user_id, start_date, end_date
  Returns: {daily_usage: [{date, bytes_processed, compute_seconds, ...}]}

GET /api/billing/job/{jobId}
  Returns: {job_id, bytes_processed, compute_seconds, job_cost, ...}
```

### Authentication

All endpoints require user identification:

```
Header: X-User-ID: user-123
or
Query: ?user_id=user-123
```

## Customization

### Styling

Edit CSS modules to customize appearance:

```css
/* JobDashboard.module.css */
.dashboard { /* Main container */ }
.jobCard { /* Job card styling */ }
.jobStatus { /* Status badge */ }
.progressBar { /* Progress indicator */ }

/* BillingDashboard.module.css */
.summaryGrid { /* Summary cards grid */ }
.card { /* Card styling */ }
.costCard { /* Cost card with gradient */ }
.usageTable { /* Usage table */ }
```

### Colors

Customize status colors in components:

```javascript
const getStatusColor = (status) => {
  const colors = {
    completed: '#10b981',  // Green
    processing: '#3b82f6', // Blue
    failed: '#ef4444',     // Red
    pending: '#f59e0b'     // Amber
  };
  return colors[status] || '#6b7280';
};
```

### Refresh Interval

Adjust auto-refresh frequency:

```javascript
// Default: 5 seconds
const interval = setInterval(fetchJobs, 5000);

// Custom: 10 seconds
const interval = setInterval(fetchJobs, 10000);
```

### Date Format

Customize date formatting:

```javascript
// Current: toLocaleDateString()
new Date(job.createdAt).toLocaleDateString()

// Alternative: ISO format
new Date(job.createdAt).toISOString().split('T')[0]

// Alternative: Custom format
new Date(job.createdAt).toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
```

### Pagination

Implement pagination for large job lists:

```javascript
const [page, setPage] = useState(1);
const limit = 50;
const offset = (page - 1) * limit;

const response = await fetch(
  `/api/jobs?user_id=${userId}&limit=${limit}&offset=${offset}`
);
```

### Export to CSV

Add export functionality:

```javascript
const exportToCSV = (data) => {
  const csv = [
    ['Date', 'Bytes', 'Compute', 'Jobs', 'Cost'],
    ...data.map(d => [
      d.date,
      d.bytes_processed,
      d.compute_seconds,
      d.job_count,
      (d.bytes_processed / 1024 / 1024 / 1024 * 0.001 + d.compute_seconds * 0.0001).toFixed(4)
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'billing-report.csv';
  a.click();
};
```

## Examples

### Example 1: Fetch Job List

```javascript
const fetchJobs = async () => {
  const userId = localStorage.getItem('userId');
  const response = await fetch(`/api/jobs?user_id=${userId}&limit=50`);
  const data = await response.json();
  setJobs(data.jobs);
};
```

### Example 2: Download Job Result

```javascript
const handleDownload = async (jobId) => {
  const response = await fetch(`/api/jobs/${jobId}/download`);
  const data = await response.json();
  window.open(data.download_url, '_blank');
};
```

### Example 3: Get Billing Summary

```javascript
const fetchBillingData = async () => {
  const userId = localStorage.getItem('userId');
  const response = await fetch(`/api/billing/summary?user_id=${userId}`);
  const summary = await response.json();
  setSummary(summary);
};
```

### Example 4: Generate Monthly Report

```javascript
const generateMonthlyReport = async () => {
  const userId = localStorage.getItem('userId');
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  
  const response = await fetch(
    `/api/billing/daily-usage?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
  );
  const data = await response.json();
  
  // Calculate totals
  const totalBytes = data.daily_usage.reduce((sum, d) => sum + d.bytes_processed, 0);
  const totalSeconds = data.daily_usage.reduce((sum, d) => sum + d.compute_seconds, 0);
  const totalCost = (totalBytes / 1024 / 1024 / 1024 * 0.001) + (totalSeconds * 0.0001);
  
  console.log(`Monthly Report: ${totalBytes} bytes, ${totalSeconds}s compute, $${totalCost.toFixed(2)}`);
};
```

## Troubleshooting

### Dashboard Not Loading

**Problem**: Dashboard shows blank or error

**Solution**:
1. Check browser console for errors
2. Verify API is running: `curl http://localhost:3000/api/health`
3. Check user ID is set: `localStorage.getItem('userId')`
4. Verify CORS settings if using different domain

### Jobs Not Showing

**Problem**: Job list is empty

**Solution**:
1. Verify jobs exist: `GET /api/jobs`
2. Check user ID matches: `X-User-ID` header
3. Verify job data in Redis: `redis-cli keys job:*`
4. Check API logs: `docker-compose logs api`

### Download Link Expired

**Problem**: Download link returns 403 Forbidden

**Solution**:
1. Presigned URLs expire after 1 hour
2. Generate new download URL: `GET /api/jobs/{jobId}/download`
3. Download immediately after generating URL
4. Contact support if issue persists

### Billing Data Incorrect

**Problem**: Estimated cost doesn't match

**Solution**:
1. Verify pricing rates in config
2. Check bytes_processed and compute_seconds
3. Recalculate: `(GB * 0.001) + (seconds * 0.0001)`
4. Check for volume discounts

## References

- [JobDashboard Component](./frontend/src/components/JobDashboard.jsx)
- [BillingDashboard Component](./frontend/src/components/BillingDashboard.jsx)
- [API Endpoints](./src/server.js)
- [Billing Module](./src/billing.js)
