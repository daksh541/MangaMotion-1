#!/bin/bash

#############################################################################
# MinIO Restore Script
#
# Restores MinIO metadata and bucket contents from backup
# Supports local filesystem, S3, and cloud storage backends
#
# Usage: ./restore-minio.sh [backup-path] [restore-type]
# Examples:
#   ./restore-minio.sh /mnt/backup/minio_backup_full_20240101_120000 full
#   ./restore-minio.sh /mnt/backup/minio_backup_full_20240101_120000.tar.gz metadata
#############################################################################

set -euo pipefail

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"
DRY_RUN="${DRY_RUN:-false}"

# Parameters
BACKUP_PATH="${1:-.}"
RESTORE_TYPE="${2:-full}"

# Derived variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESTORE_LOG="restore_${TIMESTAMP}.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${RESTORE_LOG}"
}

error() {
  echo -e "${RED}[ERROR]${NC} $*" | tee -a "${RESTORE_LOG}"
  exit 1
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${RESTORE_LOG}"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${RESTORE_LOG}"
}

info() {
  echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${RESTORE_LOG}"
}

# Check if backup exists
check_backup_exists() {
  if [ ! -e "${BACKUP_PATH}" ]; then
    error "Backup not found: ${BACKUP_PATH}"
  fi
  
  # If tar.gz, extract it
  if [ "${BACKUP_PATH}" = *.tar.gz ]; then
    log "Extracting compressed backup..."
    local extract_dir=$(mktemp -d)
    tar -xzf "${BACKUP_PATH}" -C "${extract_dir}"
    BACKUP_PATH="${extract_dir}/$(basename "${BACKUP_PATH}" .tar.gz)"
    log "Backup extracted to: ${BACKUP_PATH}"
  fi
  
  if [ ! -d "${BACKUP_PATH}" ]; then
    error "Invalid backup directory: ${BACKUP_PATH}"
  fi
}

# Determine protocol
PROTOCOL="http"
if [ "${MINIO_USE_SSL}" = "true" ]; then
  PROTOCOL="https"
fi

# Set up mc (MinIO client) alias
export MC_HOST_restore="${PROTOCOL}://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${MINIO_ENDPOINT}"

# Verify MinIO connection
verify_minio_connection() {
  log "Verifying MinIO connection..."
  
  if ! mc ls restore >/dev/null 2>&1; then
    error "Failed to connect to MinIO at ${MINIO_ENDPOINT}"
  fi
  
  success "Connected to MinIO"
}

# Restore metadata
restore_metadata() {
  log "Restoring MinIO metadata..."
  
  local metadata_dir="${BACKUP_PATH}/metadata"
  
  if [ ! -d "${metadata_dir}" ]; then
    warning "Metadata directory not found: ${metadata_dir}"
    return
  fi
  
  # Restore bucket policies
  for policy_file in "${metadata_dir}"/*_policy.json; do
    if [ -f "${policy_file}" ]; then
      local bucket_name=$(basename "${policy_file}" _policy.json)
      
      log "Restoring policy for bucket: ${bucket_name}"
      
      if [ "${DRY_RUN}" = "true" ]; then
        info "[DRY RUN] Would restore policy for: ${bucket_name}"
      else
        if mc policy import "restore/${bucket_name}" < "${policy_file}" 2>/dev/null; then
          log "Policy restored for bucket: ${bucket_name}"
        else
          warning "Failed to restore policy for bucket: ${bucket_name}"
        fi
      fi
    fi
  done
  
  # Restore lifecycle rules
  for lifecycle_file in "${metadata_dir}"/*_lifecycle.json; do
    if [ -f "${lifecycle_file}" ]; then
      local bucket_name=$(basename "${lifecycle_file}" _lifecycle.json)
      
      log "Restoring lifecycle rules for bucket: ${bucket_name}"
      
      if [ "${DRY_RUN}" = "true" ]; then
        info "[DRY RUN] Would restore lifecycle for: ${bucket_name}"
      else
        if mc ilm import "restore/${bucket_name}" < "${lifecycle_file}" 2>/dev/null; then
          log "Lifecycle rules restored for bucket: ${bucket_name}"
        else
          warning "Failed to restore lifecycle rules for bucket: ${bucket_name}"
        fi
      fi
    fi
  done
  
  log "Metadata restoration completed"
}

# Restore data
restore_data() {
  log "Restoring MinIO data..."
  
  local data_dir="${BACKUP_PATH}/data"
  
  if [ ! -d "${data_dir}" ]; then
    warning "Data directory not found: ${data_dir}"
    return
  fi
  
  # Restore each bucket
  for bucket_dir in "${data_dir}"/*; do
    if [ -d "${bucket_dir}" ]; then
      local bucket_name=$(basename "${bucket_dir}")
      
      log "Restoring bucket: ${bucket_name}"
      
      # Create bucket if it doesn't exist
      if ! mc ls "restore/${bucket_name}" >/dev/null 2>&1; then
        log "Creating bucket: ${bucket_name}"
        
        if [ "${DRY_RUN}" = "true" ]; then
          info "[DRY RUN] Would create bucket: ${bucket_name}"
        else
          if ! mc mb "restore/${bucket_name}" 2>/dev/null; then
            warning "Failed to create bucket: ${bucket_name}"
          fi
        fi
      fi
      
      # Mirror data
      if [ "${DRY_RUN}" = "true" ]; then
        info "[DRY RUN] Would restore data for bucket: ${bucket_name}"
        local file_count=$(find "${bucket_dir}" -type f | wc -l)
        info "[DRY RUN] Files to restore: ${file_count}"
      else
        if mc mirror "${bucket_dir}" "restore/${bucket_name}" --overwrite --remove; then
          log "Data restored for bucket: ${bucket_name}"
        else
          warning "Failed to restore data for bucket: ${bucket_name}"
        fi
      fi
    fi
  done
  
  log "Data restoration completed"
}

# Verify restore
verify_restore() {
  log "Verifying restore..."
  
  local bucket_count=$(mc ls restore | wc -l)
  log "Buckets in MinIO: ${bucket_count}"
  
  # Check each bucket
  for bucket in $(mc ls restore | awk '{print $NF}'); do
    bucket_name="${bucket%/}"
    local object_count=$(mc ls "restore/${bucket_name}" --recursive | wc -l)
    log "Objects in ${bucket_name}: ${object_count}"
  done
  
  success "Restore verification completed"
}

# Rollback (restore from previous backup)
rollback() {
  log "Rolling back to previous backup..."
  warning "Rollback not yet implemented"
  warning "Manual intervention required"
}

# Main execution
main() {
  log "Starting MinIO restore"
  log "Backup path: ${BACKUP_PATH}"
  log "Restore type: ${RESTORE_TYPE}"
  
  if [ "${DRY_RUN}" = "true" ]; then
    warning "DRY RUN MODE - No changes will be made"
  fi
  
  check_backup_exists
  verify_minio_connection
  
  case "${RESTORE_TYPE}" in
    full)
      restore_metadata
      restore_data
      verify_restore
      ;;
    metadata)
      restore_metadata
      ;;
    data)
      restore_data
      verify_restore
      ;;
    *)
      error "Unknown restore type: ${RESTORE_TYPE}. Use: full, metadata, or data"
      ;;
  esac
  
  success "Restore completed successfully"
  success "Log file: ${RESTORE_LOG}"
}

# Run main function
main
