# MangaMotion - Lite MVP Backend

Full-stack infrastructure for converting manga pages into motion videos using AI.

## Architecture Overview

```
Frontend (React) <---> Express API (Node.js)
                            |
                    S3 Bucket (Storage)
                            |
                    Redis/BullMQ (Queue)
                            |
                    Worker (Python AI) --> GPU Processing
```

## Project Structure

```
mangamotion/
├── backend/                    # Node.js Express API
│   ├── package.json           # Dependencies
│   └── src/
│       ├── config.js          # Configuration
│       ├── server.js          # Main server
│       ├── s3.js              # AWS S3 utilities
│       └── queue/
│           ├── queues.js      # BullMQ setup
│           └── workers/
│               └── ai-worker-spawn.js  # Spawns Python worker
│
├── python-worker/             # AI Processing Worker
│   ├── worker_main.py        # Main worker script
│   └── requirements.txt      # Python dependencies
│
├── frontend/                  # React Components
│   └── src/
│       └── components/
│           ├── UploadForm.jsx      # Multipart upload
│           ├── PresignUpload.jsx   # S3 presign upload
│           └── Processing.jsx      # Job status polling
│
└── docs/                      # Documentation
    ├── pr_body.md            # Pull request template
    ├── QA_CHECKLIST.md       # Testing instructions
    ├── CONFLUENCE_MVP.md     # Confluence page
    ├── JIRA_ITEMS.md         # Jira tickets
    └── GIT_WORKFLOW.md       # Git workflow guide
```

## Quick Start

### Prerequisites

- Node.js 16+
- Python 3.x
- Redis (Docker or local)
- AWS account (for S3 testing)

### 1. Start Redis

```bash
docker run -p 6379:6379 -d redis:6
```

### 2. Setup Backend

```bash
cd mangamotion/backend
npm install
npm run dev
```

Server starts on `http://localhost:3000`

### 3. Start Worker

In a new terminal:

```bash
cd mangamotion/backend
node src/queue/workers/ai-worker-spawn.js
```

### 4. Setup Python Worker

```bash
cd mangamotion/python-worker
pip install -r requirements.txt
```

### 5. Test Upload

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "pages=@/path/to/image.jpg" \
  -F 'options={"fps":12,"style":"lite"}'
```

## API Endpoints

### POST /api/upload
Upload manga pages for processing (dev mode: multipart, prod mode: S3 keys)

**Dev Mode (Multipart):**
```bash
POST /api/upload
Content-Type: multipart/form-data

pages: [file, file, ...]
options: {"fps": 12, "style": "lite"}
```

**Response:**
```json
{
  "jobId": "1"
}
```

### POST /api/presign
Get presigned S3 URL for direct upload

**Request:**
```json
{
  "filename": "page1.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "key": "uuid_page1.jpg",
  "url": "https://s3.amazonaws.com/...",
  "expiresIn": 600
}
```

### GET /api/status/:jobId
Check job processing status

**Response:**
```json
{
  "status": "active",
  "progress": 45,
  "data": {...},
  "failedReason": null,
  "returnvalue": null
}
```

## Environment Variables

Create a `.env` file in the backend directory:

```bash
# Server
PORT=3000

# Storage
UPLOAD_DIR=./uploads
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Queue
REDIS_URL=redis://127.0.0.1:6379
```

## Development Workflow

### 1. Dev Mode (Local Files)
- Upload files via multipart form
- Files stored in `./uploads`
- Worker processes from local files

### 2. Production Mode (S3)
- Client requests presigned URL
- Client uploads directly to S3
- Worker downloads from S3 for processing

## Testing

Follow the comprehensive testing guide:

```bash
cat mangamotion/docs/QA_CHECKLIST.md
```

Key tests:
1. Single image upload → job completion
2. Multiple images (10+) upload
3. Progress updates (10% → 100%)
4. S3 presign flow
5. Error handling

## Documentation

- **[QA Checklist](docs/QA_CHECKLIST.md)** - Step-by-step testing guide
- **[PR Body](docs/pr_body.md)** - Pull request template
- **[Confluence MVP](docs/CONFLUENCE_MVP.md)** - Detailed MVP specification
- **[Jira Items](docs/JIRA_ITEMS.md)** - Sprint planning and tickets
- **[Git Workflow](docs/GIT_WORKFLOW.md)** - Branch and PR instructions

## Tech Stack

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express 4.x
- **Queue**: BullMQ + Redis
- **Storage**: AWS S3 (SDK v3)
- **File Upload**: Multer

### Python Worker
- **Runtime**: Python 3.x
- **Libraries**: opencv-python, numpy
- **Processing**: GPU-accelerated (RunPod)

### Frontend
- **Framework**: React 18
- **Components**: Upload, Processing, Status

## Security

- AWS credentials in environment only
- Presigned URLs with 10-minute expiry
- File type/size validation
- Rate limiting on endpoints
- Least-privilege IAM policies

## Next Steps

1. ✅ Basic upload + queue infrastructure (MVP-001, MVP-002, MVP-003)
2. ✅ Frontend components (MVP-004)
3. 🔄 S3 presign flow (MVP-005)
4. 🔄 Security & quotas (MVP-006)
5. 🔄 Deployment (MVP-007)

## Troubleshooting

### Redis Connection Error
```bash
docker ps  # Check if Redis is running
docker logs <container-id>
```

### Python Worker Not Found
```bash
# Update path in ai-worker-spawn.js
const pythonPath = path.join(__dirname, '..', '..', '..', 'python-worker', 'worker_main.py');
```

### S3 Upload Fails
```bash
# Verify credentials
echo $AWS_ACCESS_KEY_ID
aws s3 ls s3://$S3_BUCKET  # Test access
```

## Support

For issues and questions:
1. Check [QA Checklist](docs/QA_CHECKLIST.md)
2. Review [Confluence MVP](docs/CONFLUENCE_MVP.md)
3. Create Jira ticket with [JIRA_ITEMS](docs/JIRA_ITEMS.md) template

## License

Proprietary - All rights reserved
