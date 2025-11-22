# Quick QA Checklist - DO NOT SKIP

## Prerequisites
1. Install Redis: `docker run -p 6379:6379 -d redis:6`
2. Set environment variables for S3 (if testing presign flow):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET`

## Backend Testing

### Step 1: Install and Start Backend
```bash
cd mangamotion/backend
npm install
npm run dev
```

Expected output: `Server listening on 3000`

### Step 2: Start AI Worker
In a new terminal:
```bash
cd mangamotion/backend
node src/queue/workers/ai-worker-spawn.js
```

Expected output: `AI worker started`

### Step 3: Test Multipart Upload (Dev Mode)
Use Postman or curl to upload a test image:

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "pages=@/path/to/test-image.jpg" \
  -F 'options={"fps":12,"style":"lite"}'
```

Expected response:
```json
{
  "jobId": "1"
}
```

Watch the worker terminal - you should see progress updates (10, 40, 80, 100) and final OUTPUT line.

### Step 4: Check Job Status
```bash
curl http://localhost:3000/api/status/1
```

Expected response:
```json
{
  "status": "completed",
  "progress": 100,
  "data": {...},
  "failedReason": null,
  "returnvalue": {...}
}
```

### Step 5: Test Presign Flow (if S3 configured)
```bash
# Request presigned URL
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```

Expected response:
```json
{
  "key": "uuid_test.jpg",
  "url": "https://s3.amazonaws.com/...",
  "expiresIn": 600
}
```

Then upload to S3:
```bash
curl -X PUT "<presigned_url_from_above>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/test-image.jpg"
```

Expected: 200 OK response

## Frontend Testing

### Step 1: Test UploadForm Component
1. Use the React upload form to select one small image
2. Click "Start" button
3. Confirm server returns jobId
4. Check browser console for any errors

### Step 2: Test Processing Component
1. After successful upload, processing screen should appear
2. Progress bar should update from 0% to 100%
3. Status should show: queued → active → completed
4. No console errors

## Troubleshooting

### Common Issues

**Issue: "redis connection refused"**
- Solution: Ensure Redis is running on port 6379
- Check: `docker ps` to see if Redis container is running

**Issue: "python3 not found"**
- Solution: Install Python 3 or update the worker to use `python` instead
- Check: `which python3`

**Issue: "Cannot find module 'bullmq'"**
- Solution: Run `npm install` in backend directory
- Check: `ls node_modules/bullmq`

**Issue: "S3 upload failed"**
- Solution: Verify AWS credentials are set in environment
- Check: `echo $AWS_ACCESS_KEY_ID`

**Issue: Worker not processing jobs**
- Solution: Check worker terminal for errors
- Verify Redis connection
- Check Python worker path in ai-worker-spawn.js

## Success Criteria
- ✅ Single image upload completes with jobId
- ✅ Worker shows progress: 10% → 40% → 80% → 100%
- ✅ Status endpoint returns completed state
- ✅ No errors in console or terminal logs
- ✅ (If S3 configured) Presign + upload flow works

## If Tests Fail
DO NOT SKIP: Paste exact console logs and error messages. Include:
1. Full stack trace
2. Node version (`node --version`)
3. Redis version (`docker exec <container> redis-cli INFO server`)
4. Environment variable status (without exposing secrets)

Half-baked error logs are useless - provide complete information for debugging.
