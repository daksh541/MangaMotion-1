# Jira Items for MangaMotion MVP

Create these as tickets in Jira (type = Story/Task). Include labels: `mvp-lite`, `backend`, `infra`, `frontend`.

---

## MVP-001: Implement multipart /api/upload (dev)

**Type**: Story  
**Priority**: High  
**Labels**: mvp-lite, backend  
**Sprint**: Sprint 1

**Description**:  
Implement Multer-based upload endpoint storing files to ./uploads. Add validation for file type and size.

**Acceptance Criteria**:
- Upload single image: server stores file and returns jobId
- Upload 10 images: server handles multipart and returns jobId
- Invalid file type: returns 400 with error message
- Exceeds file limit: returns 413 with error message
- Files stored in UPLOAD_DIR with unique filenames

**Technical Notes**:
- Use multer.diskStorage for local file storage
- Validate MIME types (images, PDF only)
- Set MAX_FILE_COUNT to 50
- Generate unique filenames with UUID

**Estimated Effort**: 5 story points

---

## MVP-002: Add BullMQ queue + Redis infra

**Type**: Story  
**Priority**: High  
**Labels**: mvp-lite, backend, infra  
**Sprint**: Sprint 1

**Description**:  
Add BullMQ queue, scheduler, ability to add jobs and read job status.

**Acceptance Criteria**:
- Jobs added to queue successfully
- Jobs visible in Redis (use Redis CLI or GUI)
- GET /api/status/:jobId returns job state (queued, active, completed, failed)
- Job progress can be updated (0-100)
- Failed jobs retain failure reason

**Technical Notes**:
- Use IORedis for connection
- Configure REDIS_URL via environment
- Implement QueueScheduler for delayed jobs
- Set removeOnComplete: true, removeOnFail: false

**Estimated Effort**: 8 story points

---

## MVP-003: Implement AI worker spawn (Node → Python)

**Type**: Story  
**Priority**: High  
**Labels**: mvp-lite, backend, infra  
**Sprint**: Sprint 1

**Description**:  
Worker consumes jobs and spawns Python worker_main.py, streaming progress back to BullMQ.

**Acceptance Criteria**:
- Worker starts and connects to BullMQ
- Worker consumes jobs from queue
- Spawns Python process with job data as JSON argument
- Captures PROGRESS:XX output and updates job.updateProgress()
- Captures OUTPUT:/path/to/result and sets job returnvalue
- Failed spawns mark job as failed with error message

**Technical Notes**:
- Use child_process.execFile
- Set concurrency: 1 for prototype
- Parse stdout for PROGRESS and OUTPUT patterns
- Handle Python errors and stderr
- Set maxBuffer to 50MB

**Estimated Effort**: 13 story points

---

## MVP-004: Frontend: Upload form + Processing screen

**Type**: Story  
**Priority**: High  
**Labels**: mvp-lite, frontend  
**Sprint**: Sprint 1

**Description**:  
Add React components for upload and processing polling.

**Acceptance Criteria**:
- UploadForm component: file selection and upload
- Upload triggers job and returns jobId
- Processing component: displays progress bar (0-100%)
- Processing component: polls /api/status every 2 seconds
- Processing component: shows current status (queued, active, completed, failed)
- Failed jobs display error message
- Completed jobs trigger onComplete callback

**Technical Notes**:
- Use FormData for multipart upload
- Implement polling with useEffect
- Clean up polling on component unmount
- Handle upload errors gracefully
- Display progress bar with visual feedback

**Estimated Effort**: 8 story points

---

## MVP-005: Presign endpoint + S3 upload flow

**Type**: Story  
**Priority**: Medium  
**Labels**: mvp-lite, backend, infra  
**Sprint**: Sprint 2

**Description**:  
Implement /api/presign endpoint, client upload to S3, and /api/start-processing with S3 keys.

**Acceptance Criteria**:
- POST /api/presign returns { key, url, expiresIn }
- Presigned URL allows PUT upload to S3
- Upload completes successfully to S3
- /api/upload accepts s3Keys parameter
- Worker downloads files from S3 for processing
- End-to-end flow: presign → upload → process → output

**Technical Notes**:
- Use @aws-sdk/client-s3 v3
- Set presigned URL expiry to 10 minutes
- Use PutObjectCommand with ACL: private
- Validate AWS credentials in environment
- Generate unique keys with UUID prefix

**Estimated Effort**: 13 story points

---

## MVP-006: Add security & quotas

**Type**: Story  
**Priority**: Medium  
**Labels**: mvp-lite, backend, security  
**Sprint**: Sprint 2

**Description**:  
Validate file sizes/types, set per-job limits, and ensure worker concurrency limit.

**Acceptance Criteria**:
- File type validation: only images and PDF allowed
- File size limit: reject files > 10MB
- Total files per job: max 50 pages
- Worker concurrency set to 1-2
- Attempt to upload oversized file: returns 413 error
- Attempt to upload invalid type: returns 400 error
- Rate limiting on API endpoints (optional but recommended)

**Technical Notes**:
- Validate MIME types server-side
- Use multer limits configuration
- Set worker concurrency in BullMQ options
- Consider express-rate-limit middleware
- Log security violations

**Estimated Effort**: 5 story points

---

## MVP-007: Deploy skeleton (Render + RunPod)

**Type**: Story  
**Priority**: Medium  
**Labels**: mvp-lite, infra, deployment  
**Sprint**: Sprint 2

**Description**:  
Dockerize backend and worker, add documentation with deployment steps.

**Acceptance Criteria**:
- Backend Dockerfile created and tested
- Python worker Dockerfile created and tested
- Backend deployed on Render
- Worker runs on RunPod GPU instance
- Test job processes successfully end-to-end
- Deployment documentation includes all required ENV vars
- Health check endpoint returns 200

**Technical Notes**:
- Use multi-stage Docker builds
- Set NODE_ENV=production
- Configure Redis connection for managed instance
- Document S3 bucket setup and IAM policies
- Add health check endpoint: GET /health
- Document RunPod setup and GPU requirements

**Estimated Effort**: 13 story points

---

## Additional Recommended Tasks

### MVP-008: Logging and monitoring
**Type**: Task  
**Priority**: Low  
**Labels**: mvp-lite, infra

Add structured logging and basic monitoring:
- Winston or Pino for structured logs
- Log all API requests and responses
- Log worker job start/complete/fail
- Basic metrics: job count, success rate, processing time

**Estimated Effort**: 3 story points

---

### MVP-009: Unit tests
**Type**: Task  
**Priority**: Low  
**Labels**: mvp-lite, testing

Add unit tests for critical paths:
- Upload endpoint validation
- Job queue operations
- Presign URL generation
- Status endpoint responses

**Estimated Effort**: 5 story points

---

### MVP-010: Integration tests
**Type**: Task  
**Priority**: Low  
**Labels**: mvp-lite, testing

Add end-to-end integration tests:
- Full upload → process → completion flow
- S3 presign → upload → process flow
- Error handling scenarios
- Worker failure recovery

**Estimated Effort**: 8 story points

---

## Total Estimated Effort
- MVP-001 to MVP-007: **65 story points**
- Additional tasks: **16 story points**
- **Total: 81 story points**

## Recommended Sprint Distribution
- **Sprint 1** (Core MVP): MVP-001, MVP-002, MVP-003, MVP-004 (34 points)
- **Sprint 2** (Production Ready): MVP-005, MVP-006, MVP-007 (31 points)
- **Sprint 3** (Polish): MVP-008, MVP-009, MVP-010 (16 points)
