// worker/model-adapter.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Model Adapter Base Class
 * Abstracts different model backends (Python, HTTP API, etc.)
 */
class ModelAdapter {
  constructor(config = {}) {
    this.config = config;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async infer(params) {
    throw new Error('infer() must be implemented by subclass');
  }

  async retry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < this.retries) {
        console.log(`Retry attempt ${attempt}/${this.retries} after ${this.retryDelay}ms...`);
        await new Promise(r => setTimeout(r, this.retryDelay));
        return this.retry(fn, attempt + 1);
      }
      throw err;
    }
  }
}

/**
 * Python Subprocess Adapter
 * Runs Python model via subprocess
 */
class PythonSubprocessAdapter extends ModelAdapter {
  constructor(config = {}) {
    super(config);
    this.pythonScript = config.pythonScript || path.join(__dirname, 'model.py');
    this.pythonPath = config.pythonPath || 'python3';
  }

  async infer(params) {
    const { inputPath, prompt, style, seed, onProgress } = params;

    return this.retry(async () => {
      return new Promise((resolve, reject) => {
        const args = [
          this.pythonScript,
          '--input', inputPath,
          '--prompt', prompt,
          '--style', style || 'default',
          '--seed', seed || '0',
          '--output-dir', path.dirname(inputPath)
        ];

        console.log(`[ModelAdapter] Running: ${this.pythonPath} ${args.join(' ')}`);

        const process = spawn(this.pythonPath, args);
        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
          console.log(`[Model] ${data.toString().trim()}`);

          // Parse progress from output
          const progressMatch = output.match(/progress:\s*(\d+)/);
          if (progressMatch && onProgress) {
            onProgress(parseInt(progressMatch[1]) / 100);
          }
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error(`[Model Error] ${data.toString().trim()}`);
        });

        process.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
          } else {
            // Parse output for frames path
            const framesMatch = output.match(/frames_path:\s*(.+)/);
            const framesPath = framesMatch ? framesMatch[1].trim() : path.join(path.dirname(inputPath), 'frames');

            resolve({
              success: true,
              framesPath
            });
          }
        });

        process.on('error', (err) => {
          reject(new Error(`Failed to start Python process: ${err.message}`));
        });
      });
    });
  }
}

/**
 * HTTP API Adapter
 * Calls remote model service via HTTP
 */
class HTTPAPIAdapter extends ModelAdapter {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.timeout = config.timeout || 300000; // 5 minutes
  }

  async infer(params) {
    const { inputPath, prompt, style, seed, onProgress } = params;

    return this.retry(async () => {
      const fetch = (await import('node-fetch')).default;

      const formData = new FormData();
      formData.append('input_file', fs.createReadStream(inputPath));
      formData.append('prompt', prompt);
      formData.append('style', style || 'default');
      formData.append('seed', seed || '0');

      const response = await fetch(`${this.baseUrl}/infer`, {
        method: 'POST',
        body: formData,
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Model inference failed');
      }

      return {
        success: true,
        framesPath: result.frames_path
      };
    });
  }
}

/**
 * Mock Adapter (for testing/demo)
 * Simulates model inference
 */
class MockAdapter extends ModelAdapter {
  async infer(params) {
    const { inputPath, prompt, style, seed, onProgress } = params;

    console.log(`[MockAdapter] Simulating inference for: ${prompt}`);

    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 500));
      if (onProgress) {
        onProgress(i / 100);
      }
      console.log(`[MockAdapter] Progress: ${i}%`);
    }

    // Return mock frames path
    const framesPath = inputPath.replace(/\.[^.]+$/, '_frames');
    fs.mkdirSync(framesPath, { recursive: true });

    console.log(`[MockAdapter] Inference complete: ${framesPath}`);

    return {
      success: true,
      framesPath
    };
  }
}

/**
 * Factory function to create adapter based on config
 */
function createModelAdapter(config = {}) {
  const type = config.type || process.env.MODEL_ADAPTER_TYPE || 'mock';

  switch (type) {
    case 'python':
      return new PythonSubprocessAdapter(config);
    case 'http':
      return new HTTPAPIAdapter(config);
    case 'mock':
    default:
      return new MockAdapter(config);
  }
}

module.exports = {
  ModelAdapter,
  PythonSubprocessAdapter,
  HTTPAPIAdapter,
  MockAdapter,
  createModelAdapter
};
