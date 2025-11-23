#!/bin/bash

# test-upload-flow.sh - End-to-end test script for upload → enqueue → respond flow

set -e

echo "=========================================="
echo "MangaMotion Upload Flow Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3000"
TEST_FILE="/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov"
PROMPT="make this anime-style, add subtle camera parallax, 24fps"

# Check if backend is running
echo -e "${YELLOW}[1/5] Checking backend connectivity...${NC}"
if ! curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ Backend not running at $BACKEND_URL${NC}"
  echo "Start backend with: cd mangamotion/backend && npm start"
  exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Check if test file exists
echo -e "${YELLOW}[2/5] Checking test file...${NC}"
if [ ! -f "$TEST_FILE" ]; then
  echo -e "${RED}✗ Test file not found: $TEST_FILE${NC}"
  echo "Please ensure the file exists or update TEST_FILE in this script"
  exit 1
fi
FILE_SIZE=$(du -h "$TEST_FILE" | cut -f1)
echo -e "${GREEN}✓ Test file found: $FILE_SIZE${NC}"
echo ""

# Upload file
echo -e "${YELLOW}[3/5] Uploading file...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/upload" \
  -F "file=@$TEST_FILE" \
  -F "prompt=$PROMPT")

JOB_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo -e "${RED}✗ Upload failed${NC}"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ File uploaded successfully${NC}"
echo "Job ID: $JOB_ID"
echo ""

# Poll job status
echo -e "${YELLOW}[4/5] Polling job status...${NC}"
MAX_POLLS=60
POLL_COUNT=0
STATUS="queued"

while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ] && [ $POLL_COUNT -lt $MAX_POLLS ]; do
  POLL_COUNT=$((POLL_COUNT + 1))
  
  STATUS_RESPONSE=$(curl -s "$BACKEND_URL/api/status/$JOB_ID")
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
  
  if [ -z "$STATUS" ]; then
    echo -e "${RED}✗ Failed to get job status${NC}"
    echo "Response: $STATUS_RESPONSE"
    exit 1
  fi
  
  printf "\r  Status: %-12s Progress: %3d%% (Poll %d/%d)" "$STATUS" "$PROGRESS" "$POLL_COUNT" "$MAX_POLLS"
  
  if [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ]; then
    sleep 1
  fi
done

echo ""
echo ""

if [ "$STATUS" = "completed" ]; then
  echo -e "${GREEN}✓ Job completed successfully${NC}"
  RESULT_URL=$(echo "$STATUS_RESPONSE" | grep -o '"resultUrl":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$RESULT_URL" ]; then
    echo "Result URL: $RESULT_URL"
  fi
else
  echo -e "${RED}✗ Job failed or timed out${NC}"
  echo "Final status: $STATUS"
  ERROR=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$ERROR" ]; then
    echo "Error: $ERROR"
  fi
  exit 1
fi

echo ""

# Summary
echo -e "${YELLOW}[5/5] Test Summary${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - File uploaded: $FILE_SIZE"
echo "  - Job ID: $JOB_ID"
echo "  - Final status: $STATUS"
echo "  - Total time: ~${POLL_COUNT}s"
echo ""
echo "Next steps:"
echo "  - Check MinIO console: http://localhost:9001"
echo "  - Check RabbitMQ console: http://localhost:15672"
echo "  - Query database: sqlite3 db.sqlite3 'SELECT * FROM jobs WHERE id = \"$JOB_ID\";'"
echo ""
