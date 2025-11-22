## What
Add backend scaffold for Lite MVP:
- Multipart upload endpoint (dev) using Multer
- S3 presign endpoint for direct client PUTs
- BullMQ queue skeleton + Redis connection
- Node worker that spawns Python worker_main.py (stub)
- Simple Python worker stub that emits PROGRESS logs

## Why
Enables safe, scalable uploads and asynchronous AI processing in a reproducible way for the MVP.

## Testing
1. `npm install && npm run dev`
2. Start Redis locally
3. POST files to `/api/upload` (multipart) -> observe jobId
4. Run the ai worker: `node src/queue/workers/ai-worker-spawn.js` and confirm progress updates.
5. Use `/api/presign` + presigned PUT + `/api/upload` with s3Keys flow for S3 mode.

## Remaining work (not in this PR)
- Full AI model integration in python-worker/ai/*.py
- Robust auth, quotas, and S3 IAM hardening
- Dockerfiles and CI/CD
- Unit/integration tests

## Checklist
- [ ] Tests for upload endpoint
- [ ] Env file / secrets setup in CI
- [ ] Deploy pipeline docs
