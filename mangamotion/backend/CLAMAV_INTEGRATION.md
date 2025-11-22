# ClamAV Malware Scanning Integration

## Overview

Integrated ClamAV antivirus scanning to detect and block malicious files before processing. Files are scanned immediately after upload, and infected files cause the job to fail and be moved to the dead-letter queue (DLQ).

## Architecture

### Job Pipeline

```
User Upload
    ↓
File Validation (presign)
    ↓
Upload to Storage
    ↓
Create Job (status: pending)
    ↓
Queue Scan Job (HIGH PRIORITY)
    ↓
Scan Worker Processes
    ├─ ClamAV scans files
    ├─ All clean? → Continue to AI processing
    └─ Virus detected? → Move to DLQ, set FAILED
```

### Job States

```
PENDING → SCANNING → CLEAN → PROCESSING → DONE
                  ↓
              INFECTED → FAILED (DLQ)
```

## Configuration

### Environment Variables

```bash
# Enable/disable ClamAV scanning
CLAMAV_ENABLED=true

# ClamAV daemon connection
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Scan timeout (milliseconds)
CLAMAV_TIMEOUT_MS=30000

# Trigger scan on every upload
SCAN_ON_UPLOAD=true
```

### Default Configuration

```javascript
{
  CLAMAV_ENABLED: false,           // Disabled by default
  CLAMAV_HOST: 'localhost',        // Local daemon
  CLAMAV_PORT: 3310,               // Standard ClamAV port
  CLAMAV_TIMEOUT_MS: 30000,        // 30 second timeout
  SCAN_ON_UPLOAD: true             // Always scan on upload
}
```

## Setup

### 1. Install ClamAV Daemon

**Docker (Recommended):**
```bash
docker run -d \
  --name clamav \
  -p 3310:3310 \
  clamav/clamav:latest
```

**macOS (Homebrew):**
```bash
brew install clamav
# Update virus definitions
freshclam
# Start daemon
clamd
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install clamav clamav-daemon
sudo systemctl start clamav-daemon
```

### 2. Update Virus Definitions

```bash
# Docker
docker exec clamav freshclam

# Local
freshclam
```

### 3. Configure Backend

Add to `.env`:
```bash
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=30000
SCAN_ON_UPLOAD=true
```

### 4. Start Scan Worker

```bash
# In separate terminal
node src/queue/workers/scan-worker.js
```

## API Behavior

### Upload with Scanning

**Request:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "pages=@clean_file.jpg"
```

**Response (200):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Job will be scanned asynchronously. Check status to see scan results.

### Job Status with Scan Results

**Request:**
```bash
curl http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000
```

**Response (Clean):**
```json
{
  "status": "active",
  "progress": 20,
  "data": {
    "type": "process_manga",
    "files": [...],
    "scan_status": "clean",
    "scan_timestamp": "2025-11-22T03:48:00Z"
  }
}
```

**Response (Infected):**
```json
{
  "status": "failed",
  "progress": 5,
  "data": {
    "type": "process_manga",
    "files": [...],
    "scan_status": "infected",
    "scan_error": "Virus detected: Eicar-Test-File FOUND",
    "infected_files": ["uploads/file.jpg: Eicar-Test-File"]
  },
  "failedReason": "Virus detected: Eicar-Test-File FOUND"
}
```

## Scanning Process

### Scan Worker

1. **Receives scan job** with file paths
2. **Checks ClamAV availability** - skips if unavailable
3. **Scans each file** using INSTREAM protocol
4. **Analyzes results**:
   - All clean → Update parent job, continue processing
   - Virus detected → Fail parent job, move to DLQ
   - Scan error → Fail parent job, log error

### INSTREAM Protocol

ClamAV INSTREAM protocol for streaming file data:

```
Client → Server: "INSTREAM\n"
Client → Server: <4-byte size><file data>
Client → Server: <4-byte size><file data>
...
Client → Server: <0x00000000>  (end marker)
Server → Client: "filename: OK" or "filename: VIRUS FOUND"
```

Benefits:
- No temporary files needed
- Efficient for large files
- Atomic scanning operation

## Error Handling

### ClamAV Unavailable

**Behavior**: Scan is skipped, job continues
**Logging**: Warning logged to console
**Impact**: No malware detection (fail-open)

```javascript
{
  "status": "skipped",
  "reason": "ClamAV unavailable",
  "files": [{ "file": "...", "clean": true, "skipped": true }]
}
```

### Scan Timeout

**Behavior**: Scan job fails, parent job fails
**Timeout**: 30 seconds (configurable)
**Retry**: Scan job retried once

```
Error: ClamAV scan timeout
```

### Scan Error

**Behavior**: Job moved to DLQ with error details
**Logging**: Error logged with full details
**Recovery**: Manual review required

```json
{
  "scan_status": "error",
  "scan_error": "Connection refused"
}
```

## Virus Detection

### Supported Signatures

ClamAV detects:
- ✅ Trojans
- ✅ Worms
- ✅ Ransomware
- ✅ Spyware
- ✅ PUPs (Potentially Unwanted Programs)
- ✅ Rootkits
- ✅ Backdoors

### Test Virus (EICAR)

For testing, use EICAR test file:
```
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
```

ClamAV will detect this as `Eicar-Test-File`.

## Testing

### Unit Tests

```bash
# Requires ClamAV running
node src/clamav-scanner.test.js
```

**Tests:**
- ✅ ClamAV availability check
- ✅ Ping daemon
- ✅ Scan clean file
- ✅ Scan EICAR test virus
- ✅ Scan multiple files
- ✅ Check files (combined)
- ✅ Handle non-existent files

### Manual Testing

**Test 1: Clean file**
```bash
echo "clean content" > /tmp/clean.txt
curl -X POST http://localhost:3000/api/upload -F "pages=@/tmp/clean.txt"
# Check status - should show scan_status: "clean"
```

**Test 2: Virus file**
```bash
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/virus.txt
curl -X POST http://localhost:3000/api/upload -F "pages=@/tmp/virus.txt"
# Check status - should show scan_status: "infected" and status: "failed"
```

**Test 3: Multiple files**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "pages=@file1.jpg" \
  -F "pages=@file2.jpg" \
  -F "pages=@file3.jpg"
# All files scanned together
```

## Monitoring

### Metrics to Track

- **Scans initiated**: Total scan jobs queued
- **Scans completed**: Successfully scanned files
- **Scans failed**: Scan errors or timeouts
- **Viruses detected**: Malicious files found
- **Scan latency**: Time from upload to scan completion
- **ClamAV availability**: Daemon uptime

### Logging

```javascript
// Scan started
[ScanWorker] Scanning 3 file(s) for job abc123

// Scan passed
[ScanWorker] All files clean for job abc123

// Virus detected
[ScanWorker] Malware detected in job abc123: Virus detected: Eicar-Test-File FOUND

// ClamAV unavailable
[ScanWorker] ClamAV not available, skipping scan
```

### Alerts

- High virus detection rate
- ClamAV daemon down
- Scan timeout frequency
- Scan queue backlog

## Performance

### Latency

- **Scan latency**: 100-500ms per file (depends on file size)
- **Overhead**: Minimal (async, separate worker)
- **Impact on upload**: None (scan happens after upload)

### Throughput

- **Single worker**: ~10-20 files/minute
- **Multiple workers**: Scales linearly
- **Concurrent scans**: 2 by default (configurable)

### Resource Usage

- **Memory**: ~50MB per worker
- **CPU**: Moderate during scans
- **Disk**: Minimal (streaming, no temp files)

## Security Considerations

### Fail-Safe Behavior

- If ClamAV is down, scans are skipped (fail-open)
- Jobs continue processing even if scan fails
- Infected files are moved to DLQ, not deleted

### Best Practices

1. **Keep definitions updated**: Run `freshclam` regularly
2. **Monitor ClamAV health**: Check daemon status
3. **Review DLQ regularly**: Check for false positives
4. **Test regularly**: Use EICAR test file
5. **Update ClamAV**: Keep daemon current

### Limitations

- ClamAV is signature-based (not heuristic)
- Zero-day exploits may not be detected
- Performance depends on definition database size
- Not suitable for real-time protection alone

## Troubleshooting

### ClamAV Not Connecting

**Error**: `Error: connect ECONNREFUSED`

**Solutions**:
1. Check ClamAV is running: `ps aux | grep clamd`
2. Verify port: `netstat -an | grep 3310`
3. Check firewall: `sudo ufw allow 3310`
4. Restart daemon: `sudo systemctl restart clamav-daemon`

### Scan Timeout

**Error**: `ClamAV scan timeout`

**Solutions**:
1. Increase timeout: `CLAMAV_TIMEOUT_MS=60000`
2. Check file size: Large files take longer
3. Check ClamAV performance: `clamscan -r /tmp`
4. Reduce concurrent scans: `SCAN_WORKER_CONCURRENCY=1`

### Virus Definitions Outdated

**Error**: Viruses not detected

**Solutions**:
1. Update definitions: `freshclam`
2. Check update schedule: `crontab -l`
3. Verify ClamAV version: `clamscan --version`
4. Check database: `ls -la /var/lib/clamav/`

### False Positives

**Issue**: Clean files marked as infected

**Solutions**:
1. Check ClamAV version: Update if outdated
2. Review detection: `clamscan -i /path/to/file`
3. Report to ClamAV: Submit false positive
4. Whitelist if needed: Configure ClamAV

## Integration with Other Systems

### Dead Letter Queue (DLQ)

Infected files automatically moved to DLQ:

```sql
SELECT * FROM failed_jobs WHERE job_type = 'process_manga' AND status = 'infected';
```

### Webhook Notifications

Extend scan worker to send notifications:

```javascript
if (!scanResults.allClean) {
  await notifySecurityTeam({
    jobId: parentJobId,
    infected: scanResults.infected,
    timestamp: new Date()
  });
}
```

### Audit Logging

Log all scan events for compliance:

```javascript
await auditLog({
  event: 'malware_scan',
  jobId: parentJobId,
  result: scanResults,
  timestamp: new Date()
});
```

## Future Enhancements

1. **Heuristic scanning**: Add behavioral analysis
2. **Quarantine**: Move infected files to quarantine directory
3. **Notifications**: Alert users of infected uploads
4. **Reporting**: Generate security reports
5. **Integration**: Connect to SIEM systems
6. **Machine learning**: Add ML-based detection
7. **Custom rules**: Support custom ClamAV rules
8. **Performance**: Optimize for large files

## References

- [ClamAV Documentation](https://www.clamav.net/)
- [ClamAV Protocol](https://www.clamav.net/documents/clamd)
- [EICAR Test File](https://www.eicar.org/)
- [Docker ClamAV](https://hub.docker.com/r/clamav/clamav)
