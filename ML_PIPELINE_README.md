# Real ML Pipeline - Phase 6

## Overview

Phase 6 replaces the worker simulation with a real ML pipeline architecture. The pipeline consists of 5 stages:

1. **Preprocess** - Validate and normalize input
2. **Model Inference** - Run ML model on input
3. **Postprocess** - Apply filters and effects
4. **Stitch** - Combine frames into video
5. **Thumbnails** - Generate preview images

## Architecture

### Pipeline Stages

```
Input File
    ↓
[Preprocess] - Validate, convert format, normalize resolution
    ↓
[Model Inference] - Run ML model (Python, HTTP API, etc.)
    ↓
[Postprocess] - Apply filters, color correction
    ↓
[Stitch] - Combine frames into MP4 using ffmpeg
    ↓
[Thumbnails] - Generate preview images
    ↓
Output Video + Thumbnail
```

### Model Adapter Pattern

The pipeline uses an adapter pattern to support different model backends:

```
Pipeline
    ↓
ModelAdapter (interface)
    ├── PythonSubprocessAdapter - Runs Python script
    ├── HTTPAPIAdapter - Calls remote HTTP service
    └── MockAdapter - Simulates inference (for testing)
```

## Components

### Pipeline (pipeline.js)

**PipelineStage Base Class:**
- `execute()` - Run stage
- `updateJobProgress()` - Update job progress in DB
- `recordStageStart()` / `recordStageEnd()` - Track timing

**Concrete Stages:**
- `PreprocessStage` - Input validation and normalization
- `ModelInferenceStage` - ML model execution
- `PostprocessStage` - Post-processing effects
- `StitchStage` - Video composition with ffmpeg
- `ThumbnailStage` - Thumbnail generation

**Pipeline Orchestrator:**
- Coordinates all stages
- Handles errors and retries
- Tracks results
- Updates job status

### Model Adapter (model-adapter.js)

**ModelAdapter Base Class:**
- `infer()` - Run inference
- `retry()` - Retry logic with exponential backoff

**Adapters:**

1. **PythonSubprocessAdapter**
   - Spawns Python subprocess
   - Passes arguments via CLI
   - Parses stdout for progress and output
   - Supports retry logic

2. **HTTPAPIAdapter**
   - Calls remote HTTP service
   - Sends input file as multipart form
   - Expects JSON response with frames_path
   - Timeout and retry support

3. **MockAdapter**
   - Simulates inference for testing
   - Generates dummy frames
   - Reports progress updates

### Worker (worker-pipeline.js)

**Job Processing:**
1. Download input from MinIO or local filesystem
2. Create pipeline with model adapter
3. Execute pipeline stages
4. Upload video and thumbnail to MinIO
5. Update job status in database

**Error Handling:**
- Catches errors at each stage
- Records error in database
- Cleans up temporary files
- Nacks message to prevent requeue

## Configuration

### Environment Variables

```bash
# Model adapter type: mock, python, http
MODEL_ADAPTER_TYPE=mock

# Python adapter
PYTHON_PATH=python3
PYTHON_SCRIPT=/path/to/model.py

# HTTP adapter
MODEL_API_URL=http://localhost:5000
MODEL_API_TIMEOUT=300000

# Database
DATABASE_FILE=/path/to/db.sqlite3

# MinIO
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=mangamotion

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
```

## Usage

### Start Pipeline Worker

```bash
# Using mock adapter (for testing)
npm run worker:pipeline

# Using Python adapter
MODEL_ADAPTER_TYPE=python npm run worker:pipeline

# Using HTTP API adapter
MODEL_ADAPTER_TYPE=http MODEL_API_URL=http://localhost:5000 npm run worker:pipeline
```

### Add to package.json

```json
{
  "scripts": {
    "worker": "node worker/worker.js",
    "worker:pipeline": "node worker/worker-pipeline.js"
  }
}
```

## Model Adapter Integration

### Python Subprocess Adapter

**Python Script Interface:**

```python
python model.py \
  --input /path/to/input.mp4 \
  --prompt "turn into anime" \
  --style studio \
  --seed 42 \
  --output-dir /path/to/output
```

**Output Format:**

```
progress: 25
progress: 50
progress: 75
progress: 100
frames_path: /path/to/output/frames
```

**Example Implementation:**

```python
#!/usr/bin/env python3
import argparse
import os
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--style', default='default')
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('--output-dir', required=True)
    
    args = parser.parse_args()
    
    # Load model
    model = load_model()
    
    # Process input
    frames = []
    for i, frame in enumerate(process_video(args.input)):
        # Run inference
        output = model.infer(
            frame,
            prompt=args.prompt,
            style=args.style,
            seed=args.seed
        )
        frames.append(output)
        
        # Report progress
        progress = int((i / total_frames) * 100)
        print(f"progress: {progress}")
    
    # Save frames
    output_dir = Path(args.output_dir)
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    for i, frame in enumerate(frames):
        frame.save(frames_dir / f"frame_{i:04d}.png")
    
    print(f"frames_path: {frames_dir}")
```

### HTTP API Adapter

**API Endpoint:**

```
POST /infer
Content-Type: multipart/form-data

input_file: <binary>
prompt: "turn into anime"
style: "studio"
seed: 42
```

**Response:**

```json
{
  "success": true,
  "frames_path": "/path/to/frames"
}
```

**Example Server (Flask):**

```python
from flask import Flask, request, jsonify
import tempfile
from pathlib import Path

app = Flask(__name__)

@app.route('/infer', methods=['POST'])
def infer():
    input_file = request.files['input_file']
    prompt = request.form['prompt']
    style = request.form.get('style', 'default')
    seed = int(request.form.get('seed', 0))
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Save input
        input_path = Path(tmpdir) / 'input.mp4'
        input_file.save(input_path)
        
        # Run model
        frames_dir = Path(tmpdir) / 'frames'
        frames_dir.mkdir()
        
        model = load_model()
        for i, frame in enumerate(process_video(input_path)):
            output = model.infer(frame, prompt=prompt, style=style, seed=seed)
            output.save(frames_dir / f"frame_{i:04d}.png")
        
        return jsonify({
            'success': True,
            'frames_path': str(frames_dir)
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Pipeline Execution Flow

### Stage Execution

```javascript
// 1. Preprocess
const preprocessResult = await preprocessStage.execute(inputPath);
// Returns: { success: true, outputPath: '...' }

// 2. Model Inference
const inferenceResult = await inferenceStage.execute(
  preprocessResult.outputPath,
  prompt,
  style,
  seed
);
// Returns: { success: true, framesPath: '...' }

// 3. Postprocess
const postprocessResult = await postprocessStage.execute(inferenceResult.framesPath);
// Returns: { success: true, framesPath: '...' }

// 4. Stitch
const stitchResult = await stitchStage.execute(
  postprocessResult.framesPath,
  outputPath
);
// Returns: { success: true, outputPath: '...' }

// 5. Thumbnails
const thumbnailResult = await thumbnailStage.execute(outputPath, thumbnailDir);
// Returns: { success: true, thumbnailPath: '...' }
```

### Error Handling

```javascript
try {
  const result = await pipeline.execute(
    inputPath,
    prompt,
    style,
    seed,
    outputPath,
    thumbnailDir
  );
  
  if (!result.success) {
    // Handle pipeline error
    console.error(`Pipeline failed: ${result.error}`);
  }
} catch (err) {
  // Handle unexpected error
  console.error(`Unexpected error: ${err.message}`);
}
```

## Progress Tracking

Each stage updates job progress in the database:

- Preprocess: 10-15%
- Inference: 15-65%
- Postprocess: 65-75%
- Stitch: 75-85%
- Thumbnails: 85-95%
- Finalization: 95-100%

Frontend polls `/api/status/:jobId` to display real-time progress.

## Performance Optimization

### Parallel Processing
- Multiple workers process jobs concurrently
- Each worker has its own temp directory
- No shared state between workers

### Resource Management
- Temp files cleaned up after job completion
- Memory-efficient frame processing
- Configurable batch sizes

### Retry Logic
- Exponential backoff for failed stages
- Configurable retry attempts
- Graceful degradation

## Testing

### Mock Adapter (Development)

```bash
MODEL_ADAPTER_TYPE=mock npm run worker:pipeline
```

Simulates inference without running actual ML model. Useful for:
- Testing pipeline architecture
- Verifying database updates
- Testing error handling
- Performance testing

### Python Adapter (Local)

```bash
MODEL_ADAPTER_TYPE=python npm run worker:pipeline
```

Runs Python model locally. Requires:
- Python 3.7+
- Model dependencies installed
- model.py script in worker directory

### HTTP Adapter (Remote)

```bash
MODEL_ADAPTER_TYPE=http MODEL_API_URL=http://localhost:5000 npm run worker:pipeline
```

Calls remote HTTP API. Requires:
- Model service running on specified URL
- Proper request/response format

## Monitoring

### Logs

Each stage logs:
- Start time
- Progress updates
- Duration
- Errors

Example:
```
[2025-11-24T00:15:30.123Z] [preprocess] Stage started
[2025-11-24T00:15:30.456Z] [preprocess] Preprocessing input...
[2025-11-24T00:15:31.789Z] [preprocess] Stage completed in 1.67s
[2025-11-24T00:15:32.012Z] [inference] Stage started
...
```

### Database Tracking

Job record updated with:
- Current progress (0-100%)
- Status (processing, completed, failed)
- Error message (if failed)
- Result path (if completed)

## Future Enhancements

1. **GPU Support** - CUDA/ROCm acceleration
2. **Batch Processing** - Process multiple jobs in parallel
3. **Model Caching** - Cache loaded models in memory
4. **Distributed Processing** - Distribute stages across multiple machines
5. **Quality Metrics** - Track output quality and performance
6. **A/B Testing** - Compare different model versions
7. **Custom Stages** - Allow plugins for custom processing
8. **Stage Skipping** - Skip unnecessary stages based on parameters

## Troubleshooting

### Python Adapter Issues

**"Python process exited with code 1"**
- Check Python script syntax
- Verify all dependencies installed
- Check input file exists

**"Failed to start Python process"**
- Verify PYTHON_PATH is correct
- Check Python is in PATH
- Verify script permissions

### HTTP Adapter Issues

**"HTTP 500"**
- Check model service is running
- Check request format matches API
- Check model service logs

**"Timeout"**
- Increase MODEL_API_TIMEOUT
- Check network connectivity
- Check model service performance

### Pipeline Issues

**"Insufficient disk space"**
- Clean up old temp files
- Increase available disk space
- Reduce frame resolution

**"Out of memory"**
- Reduce batch size
- Process shorter videos
- Increase available RAM

## Files

### Backend
- `worker/pipeline.js` - Pipeline stages
- `worker/model-adapter.js` - Model adapter implementations
- `worker/worker-pipeline.js` - Pipeline worker
- `worker/model.py` - Python model stub

### Documentation
- `ML_PIPELINE_README.md` - This file
- `ML_PIPELINE_QUICKSTART.md` - Quick start guide

## Support

For issues or questions, refer to the main project README or contact the development team.
