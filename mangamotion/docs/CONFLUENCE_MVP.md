# MangaMotion — Lite MVP (Locked Scope)

## Objective
Deliver a minimal, reliable pipeline: upload manga pages → AI pipeline (clean → color → interpolate) → output video shareable via link.

## Scope (Locked)
- Upload (images/PDF) up to 50 pages
- Processing pipeline with 3 stages: cleaning, colorization, frame interpolation
- Job queue with progress reporting
- S3-backed storage with presigned uploads
- Basic frontend integration: upload form + processing screen
- Deployment: Node backend on Render, Python GPU workers on RunPod

## Architecture (high-level)
1. Frontend (Vercel) ↔ Node Express (Render)
2. Express issues jobs to BullMQ (Redis)
3. Worker (Node or Python) consumes jobs and runs Python AI code on GPU (RunPod)
4. Storage: S3-compatible bucket for inputs & outputs

```
Frontend <---> Express API (Render)
        |                 |
     S3 Bucket <-------- Redis/BullMQ <--- Worker (RunPod GPU) --> S3
```

## API

### POST /api/presign
Body: `{ filename, contentType }`  
Response: `{ key, url, expiresIn }` (PUT URL)

### POST /api/upload
- Dev mode: multipart files `pages[]` → server stores to uploads and creates job
- Prod mode: JSON `{ s3Keys: [...], options: {...} }`

### GET /api/status/:jobId
Response: `{ status, progress, data, failedReason }`

## Operational notes
- ENV: `REDIS_URL`, `S3_BUCKET`, `AWS_*` creds
- Set `worker` concurrency = 1-2 (for prototyping)
- Secure presign: limit bucket prefix, use short expiry

## Testing checklist
1. Upload a single page: process completes → 100% → output saved to S3.
2. Upload 10 pages: system handles queue & progress.
3. Attempt unsupported file type → rejected.
4. Simulate worker failure → job set to failed state; retry works.

## Rollout & metrics
- Track: jobs started, jobs succeeded, avg GPU sec/job, fail rate.
- Startup plan: alpha for internal testing → closed beta with 50 creators.

## Technology Stack

### Backend
- **Runtime**: Node.js (Express)
- **Queue**: BullMQ + Redis
- **Storage**: S3 (AWS SDK v3)
- **File upload**: Multer (dev), S3 presigned URLs (prod)

### Python Worker
- **Runtime**: Python 3.x
- **AI Models**: TBD (cleaning, colorization, interpolation)
- **GPU**: RunPod instances

### Frontend
- **Framework**: React
- **Components**: UploadForm, PresignUpload, Processing
- **Deployment**: Vercel

## Security Considerations
- AWS credentials in environment variables only
- Presigned URLs with 10-minute expiry
- Least-privilege IAM policies (PutObject only)
- File type and size validation
- Rate limiting on API endpoints

## Future Enhancements (Post-MVP)
- User authentication and accounts
- Payment integration
- Advanced AI model options
- Batch processing optimization
- CDN for output videos
- Email notifications on completion
- Progress webhooks
