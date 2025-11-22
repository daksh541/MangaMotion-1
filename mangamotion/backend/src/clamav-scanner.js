const net = require('net');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * ClamAV Scanner - Scans files for malware using ClamAV daemon
 * 
 * Protocol: CLAMD (ClamAV daemon protocol)
 * - PING: Check if daemon is alive
 * - SCAN: Scan a file
 * - INSTREAM: Stream file data for scanning
 */

class ClamAVScanner {
  constructor() {
    this.host = config.CLAMAV_HOST;
    this.port = config.CLAMAV_PORT;
    this.timeout = config.CLAMAV_TIMEOUT_MS;
    this.enabled = config.CLAMAV_ENABLED;
  }

  /**
   * Check if ClamAV daemon is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!this.enabled) return false;

    return new Promise((resolve) => {
      const socket = net.createConnection(this.port, this.host);
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2000);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Ping ClamAV daemon
   * @returns {Promise<boolean>}
   */
  async ping() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.port, this.host);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('ClamAV ping timeout'));
      }, this.timeout);

      socket.on('connect', () => {
        socket.write('PING\n');
      });

      socket.on('data', (data) => {
        clearTimeout(timer);
        socket.destroy();
        const response = data.toString().trim();
        resolve(response === 'PONG');
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Scan a file using INSTREAM protocol
   * INSTREAM: Send file data in chunks with size prefix
   * Format: <size:4 bytes><data><size:4 bytes><data>...<0:4 bytes>
   * 
   * @param {string} filePath - Path to file to scan
   * @returns {Promise<object>} { clean: boolean, virus?: string, error?: string }
   */
  async scanFile(filePath) {
    if (!this.enabled) {
      return { clean: true, skipped: true };
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return { clean: false, error: 'File not found' };
    }

    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.port, this.host);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('ClamAV scan timeout'));
      }, this.timeout);

      let response = '';
      let fileStream = null;

      socket.on('connect', () => {
        // Send INSTREAM command
        socket.write('INSTREAM\n');
      });

      socket.on('data', (data) => {
        const chunk = data.toString();
        response += chunk;

        // Check if we got the OK response to start streaming
        if (response.includes('INSTREAM size limit exceeded') || response.includes('ERROR')) {
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`ClamAV error: ${response.trim()}`));
          return;
        }

        // If we haven't started streaming yet, start now
        if (!fileStream && response.length > 0) {
          fileStream = fs.createReadStream(filePath, { highWaterMark: 8192 });

          fileStream.on('data', (chunk) => {
            // Send chunk size (4 bytes, big-endian) + chunk data
            const sizeBuffer = Buffer.alloc(4);
            sizeBuffer.writeUInt32BE(chunk.length, 0);
            socket.write(sizeBuffer);
            socket.write(chunk);
          });

          fileStream.on('end', () => {
            // Send zero-length chunk to signal end
            const endBuffer = Buffer.alloc(4);
            endBuffer.writeUInt32BE(0, 0);
            socket.write(endBuffer);
          });

          fileStream.on('error', (err) => {
            clearTimeout(timer);
            socket.destroy();
            reject(err);
          });
        }
      });

      socket.on('end', () => {
        clearTimeout(timer);
        const result = this._parseResponse(response);
        resolve(result);
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Parse ClamAV response
   * Responses:
   * - "filename: OK" - File is clean
   * - "filename: <virus name> FOUND" - Virus detected
   * 
   * @private
   * @param {string} response - Raw response from ClamAV
   * @returns {object} { clean: boolean, virus?: string, error?: string }
   */
  _parseResponse(response) {
    const lines = response.trim().split('\n');
    
    for (const line of lines) {
      if (line.includes('FOUND')) {
        // Extract virus name
        const match = line.match(/:\s*(.+?)\s+FOUND/);
        const virusName = match ? match[1] : 'Unknown virus';
        return { clean: false, virus: virusName };
      }
      
      if (line.includes('OK')) {
        return { clean: true };
      }

      if (line.includes('ERROR')) {
        return { clean: false, error: line };
      }
    }

    // If no clear response, assume clean (fail-safe)
    return { clean: true };
  }

  /**
   * Scan multiple files
   * @param {string[]} filePaths - Array of file paths
   * @returns {Promise<object[]>} Array of scan results
   */
  async scanFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.scanFile(filePath);
        results.push({
          file: filePath,
          ...result
        });
      } catch (err) {
        results.push({
          file: filePath,
          clean: false,
          error: err.message
        });
      }
    }

    return results;
  }

  /**
   * Check if any files are infected
   * @param {string[]} filePaths - Array of file paths
   * @returns {Promise<object>} { allClean: boolean, infected: string[], errors: string[] }
   */
  async checkFiles(filePaths) {
    const results = await this.scanFiles(filePaths);
    
    const infected = [];
    const errors = [];

    for (const result of results) {
      if (!result.clean) {
        if (result.virus) {
          infected.push(`${result.file}: ${result.virus}`);
        } else if (result.error) {
          errors.push(`${result.file}: ${result.error}`);
        }
      }
    }

    return {
      allClean: infected.length === 0 && errors.length === 0,
      infected,
      errors,
      results
    };
  }
}

// Singleton instance
let scannerInstance = null;

function getScanner() {
  if (!scannerInstance) {
    scannerInstance = new ClamAVScanner();
  }
  return scannerInstance;
}

module.exports = {
  ClamAVScanner,
  getScanner
};
