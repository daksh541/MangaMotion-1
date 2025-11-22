# Git Workflow and PR Instructions

## Branch Creation

Recommended branch name:
```bash
feature/backend-upload-presign-mvp
```

## Commands to Create PR

### Step 1: Create and switch to feature branch
```bash
git checkout -b feature/backend-upload-presign-mvp
```

### Step 2: Add all new files
```bash
git add .
```

### Step 3: Commit changes
```bash
git commit -m "feat(mvp): add upload endpoint, presign S3 flow, BullMQ queue skeleton and python-worker stub"
```

### Step 4: Push to remote
```bash
git push origin feature/backend-upload-presign-mvp
```

### Step 5: Create PR with GitHub CLI
If you have GitHub CLI installed:
```bash
gh pr create --title "feat(mvp): backend upload + presign + queue scaffold" --body-file mangamotion/docs/pr_body.md --base main
```

If you don't have `gh` CLI, open the PR manually on GitHub web interface and paste the content from `mangamotion/docs/pr_body.md`.

## Files Added in This PR

### Backend Files
- `mangamotion/backend/package.json` - Dependencies configuration
- `mangamotion/backend/src/config.js` - Configuration module
- `mangamotion/backend/src/server.js` - Express server with endpoints
- `mangamotion/backend/src/s3.js` - AWS S3 presign utilities
- `mangamotion/backend/src/queue/queues.js` - BullMQ queue setup
- `mangamotion/backend/src/queue/workers/ai-worker-spawn.js` - Worker that spawns Python

### Python Worker Files
- `mangamotion/python-worker/worker_main.py` - Python worker stub
- `mangamotion/python-worker/requirements.txt` - Python dependencies

### Frontend Files
- `mangamotion/frontend/src/components/UploadForm.jsx` - Multipart upload component
- `mangamotion/frontend/src/components/PresignUpload.jsx` - S3 presign upload component
- `mangamotion/frontend/src/components/Processing.jsx` - Job status polling component

### Documentation Files
- `mangamotion/docs/pr_body.md` - Pull request description
- `mangamotion/docs/QA_CHECKLIST.md` - Testing instructions
- `mangamotion/docs/CONFLUENCE_MVP.md` - Confluence page content
- `mangamotion/docs/JIRA_ITEMS.md` - Jira tickets to create
- `mangamotion/docs/GIT_WORKFLOW.md` - This file

## Pre-PR Checklist

Before creating the PR, ensure you have:

- [ ] Reviewed all code changes
- [ ] Run `npm install` in backend directory
- [ ] Started Redis locally and tested basic flow
- [ ] Verified worker can spawn Python process
- [ ] Checked all imports are correct
- [ ] No sensitive data (keys, tokens) in code
- [ ] Updated .gitignore for node_modules, uploads/, .env
- [ ] Tested at least one successful upload → job → completion flow

## After PR is Created

1. Request review from team members
2. Address any feedback or requested changes
3. Run full QA checklist from `mangamotion/docs/QA_CHECKLIST.md`
4. Once approved, squash and merge to main

## Environment Setup for Reviewers

To test this PR, reviewers need:

**Required:**
- Node.js 16+
- Python 3.x
- Redis (via Docker or local)

**Optional (for S3 testing):**
- AWS account with S3 bucket
- AWS credentials with PutObject permissions

**Environment variables:**
```bash
# Required for S3 presign testing
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
export S3_BUCKET="your-bucket-name"

# Optional
export REDIS_URL="redis://127.0.0.1:6379"
export UPLOAD_DIR="./uploads"
export PORT="3000"
```

## Deployment Notes

This PR sets up the foundation but does not include:
- Docker configuration (see MVP-007)
- CI/CD pipelines
- Production environment configs
- Full AI model integration

These will be added in subsequent PRs.
