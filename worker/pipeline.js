// worker/pipeline.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', 'db.sqlite3');

/**
 * Pipeline Stage Base Class
 */
class PipelineStage {
  constructor(name, jobId, db) {
    this.name = name;
    this.jobId = jobId;
    this.db = db;
    this.startTime = null;
    this.endTime = null;
    this.duration = null;
    this.error = null;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] ${message}`);
  }

  updateJobProgress(progress, message = null) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?
    `).run(progress, now, this.jobId);

    if (message) {
      this.log(message);
    }
  }

  recordStageStart() {
    this.startTime = Date.now();
    this.log(`Stage started`);
  }

  recordStageEnd() {
    this.endTime = Date.now();
    this.duration = (this.endTime - this.startTime) / 1000;
    this.log(`Stage completed in ${this.duration.toFixed(2)}s`);
  }

  async execute(inputPath) {
    throw new Error('execute() must be implemented by subclass');
  }
}

/**
 * Preprocess Stage
 * Validates input, converts formats, normalizes resolution
 */
class PreprocessStage extends PipelineStage {
  async execute(inputPath) {
    this.recordStageStart();
    this.updateJobProgress(15, 'Preprocessing input...');

    try {
      const ext = path.extname(inputPath).toLowerCase();
      const outputPath = inputPath.replace(/\.[^.]+$/, '_preprocessed.mp4');

      // For demo: just copy the file (in production, would normalize format/resolution)
      if (!['.mp4', '.mov'].includes(ext)) {
        this.log(`Converting ${ext} to MP4...`);
        // In production: use ffmpeg to convert
        // For now, just copy
        fs.copyFileSync(inputPath, outputPath);
      } else {
        fs.copyFileSync(inputPath, outputPath);
      }

      this.recordStageEnd();
      return { success: true, outputPath };
    } catch (err) {
      this.error = err.message;
      this.recordStageEnd();
      this.log(`Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Model Inference Stage
 * Runs the actual ML model on the input
 */
class ModelInferenceStage extends PipelineStage {
  constructor(name, jobId, db, modelAdapter) {
    super(name, jobId, db);
    this.modelAdapter = modelAdapter;
  }

  async execute(inputPath, prompt, style, seed) {
    this.recordStageStart();
    this.updateJobProgress(35, 'Running model inference...');

    try {
      // Call model adapter (Python service, HTTP API, etc.)
      const result = await this.modelAdapter.infer({
        inputPath,
        prompt,
        style,
        seed,
        onProgress: (progress) => {
          const adjustedProgress = 35 + (progress * 0.3); // 35-65%
          this.updateJobProgress(Math.floor(adjustedProgress));
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Model inference failed');
      }

      this.recordStageEnd();
      return { success: true, framesPath: result.framesPath };
    } catch (err) {
      this.error = err.message;
      this.recordStageEnd();
      this.log(`Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Postprocess Stage
 * Applies filters, color correction, effects
 */
class PostprocessStage extends PipelineStage {
  async execute(framesPath) {
    this.recordStageStart();
    this.updateJobProgress(65, 'Postprocessing frames...');

    try {
      // For demo: frames are already processed by model
      // In production: apply additional filters, color correction, etc.
      this.log(`Postprocessing ${framesPath}...`);

      // Simulate postprocessing
      await new Promise(r => setTimeout(r, 1000));

      this.recordStageEnd();
      return { success: true, framesPath };
    } catch (err) {
      this.error = err.message;
      this.recordStageEnd();
      this.log(`Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Stitch Stage
 * Combines frames into final video using ffmpeg
 */
class StitchStage extends PipelineStage {
  async execute(framesPath, outputPath) {
    this.recordStageStart();
    this.updateJobProgress(75, 'Stitching frames into video...');

    try {
      // For demo: copy frames as output (in production, use ffmpeg)
      if (fs.existsSync(framesPath)) {
        fs.copyFileSync(framesPath, outputPath);
      } else {
        // Create dummy output
        fs.writeFileSync(outputPath, 'dummy video content');
      }

      this.log(`Video stitched: ${outputPath}`);
      this.recordStageEnd();
      return { success: true, outputPath };
    } catch (err) {
      this.error = err.message;
      this.recordStageEnd();
      this.log(`Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Thumbnail Generation Stage
 * Creates preview thumbnails from video
 */
class ThumbnailStage extends PipelineStage {
  async execute(videoPath, outputDir) {
    this.recordStageStart();
    this.updateJobProgress(85, 'Generating thumbnails...');

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // For demo: create dummy thumbnail
      const thumbPath = path.join(outputDir, 'thumb.jpg');
      fs.writeFileSync(thumbPath, 'dummy thumbnail');

      this.log(`Thumbnail generated: ${thumbPath}`);
      this.recordStageEnd();
      return { success: true, thumbnailPath: thumbPath };
    } catch (err) {
      this.error = err.message;
      this.recordStageEnd();
      this.log(`Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Pipeline Orchestrator
 */
class Pipeline {
  constructor(jobId, modelAdapter) {
    this.jobId = jobId;
    this.modelAdapter = modelAdapter;
    this.db = new Database(dbFile);
    this.stages = [];
    this.results = {};
  }

  addStage(stage) {
    this.stages.push(stage);
  }

  async execute(inputPath, prompt, style, seed, outputPath, thumbnailDir) {
    console.log(`\n[Pipeline] Starting pipeline for job ${this.jobId}`);
    console.log(`[Pipeline] Input: ${inputPath}`);
    console.log(`[Pipeline] Output: ${outputPath}`);

    try {
      // Stage 1: Preprocess
      const preprocessStage = new PreprocessStage('preprocess', this.jobId, this.db);
      let preprocessResult = await preprocessStage.execute(inputPath);
      if (!preprocessResult.success) {
        throw new Error(`Preprocess failed: ${preprocessResult.error}`);
      }
      this.results.preprocessed = preprocessResult.outputPath;

      // Stage 2: Model Inference
      const inferenceStage = new ModelInferenceStage('inference', this.jobId, this.db, this.modelAdapter);
      let inferenceResult = await inferenceStage.execute(
        preprocessResult.outputPath,
        prompt,
        style,
        seed
      );
      if (!inferenceResult.success) {
        throw new Error(`Inference failed: ${inferenceResult.error}`);
      }
      this.results.frames = inferenceResult.framesPath;

      // Stage 3: Postprocess
      const postprocessStage = new PostprocessStage('postprocess', this.jobId, this.db);
      let postprocessResult = await postprocessStage.execute(inferenceResult.framesPath);
      if (!postprocessResult.success) {
        throw new Error(`Postprocess failed: ${postprocessResult.error}`);
      }
      this.results.postprocessed = postprocessResult.framesPath;

      // Stage 4: Stitch
      const stitchStage = new StitchStage('stitch', this.jobId, this.db);
      let stitchResult = await stitchStage.execute(postprocessResult.framesPath, outputPath);
      if (!stitchResult.success) {
        throw new Error(`Stitch failed: ${stitchResult.error}`);
      }
      this.results.video = stitchResult.outputPath;

      // Stage 5: Thumbnails
      const thumbnailStage = new ThumbnailStage('thumbnail', this.jobId, this.db);
      let thumbnailResult = await thumbnailStage.execute(outputPath, thumbnailDir);
      if (!thumbnailResult.success) {
        console.warn(`Thumbnail generation failed: ${thumbnailResult.error}`);
        // Don't fail pipeline if thumbnail fails
      }
      this.results.thumbnail = thumbnailResult.thumbnailPath;

      console.log(`[Pipeline] Pipeline completed successfully`);
      return { success: true, results: this.results };
    } catch (err) {
      console.error(`[Pipeline] Pipeline failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      this.db.close();
    }
  }
}

module.exports = {
  Pipeline,
  PipelineStage,
  PreprocessStage,
  ModelInferenceStage,
  PostprocessStage,
  StitchStage,
  ThumbnailStage
};
