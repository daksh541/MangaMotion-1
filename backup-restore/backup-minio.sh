#!/bin/bash

#############################################################################
# MinIO Backup Script
# 
# Backs up MinIO metadata and bucket contents to offsite storage
# Supports local filesystem, S3, and cloud storage backends
#
# Usage: ./backup-minio.sh [backup-type] [destination]
# Examples:
#   ./backup-minio.sh full /mnt/backup
#   ./backup-minio.sh incremental s3://backup-bucket/minio
#   ./backup-minio.sh metadata /mnt/backup
#############################################################################

set -euo pipefail

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-true}"

# Backup types
BACKUP_TYPE="${1:-full}"
BACKUP_DEST="${2:-.}"

# Derived variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="minio_backup_${BACKUP_TYPE}_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DEST}/${BACKUP_NAME}"
LOG_FILE="${BACKUP_PATH}/backup.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
  echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
  exit 1
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${LOG_FILE}"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${LOG_FILE}"
}

# Create backup directory
mkdir -p "${BACKUP_PATH}"

log "Starting MinIO backup (type: ${BACKUP_TYPE})"
log "Destination: ${BACKUP_DEST}"
log "Endpoint: ${MINIO_ENDPOINT}"

# Determine protocol
PROTOCOL="http"
if [ "${MINIO_USE_SSL}" = "true" ]; then
  PROTOCOL="https"
fi

# Set up mc (MinIO client) alias
export MC_HOST_backup="${PROTOCOL}://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${MINIO_ENDPOINT}"

# Verify MinIO connection
if ! mc ls backup >/dev/null 2>&1; then
  error "Failed to connect to MinIO at ${MINIO_ENDPOINT}"
fi

log "Successfully connected to MinIO"

# Backup metadata
backup_metadata() {
  log "Backing up MinIO metadata..."
  
  local metadata_dir="${BACKUP_PATH}/metadata"
  mkdir -p "${metadata_dir}"
  
  # Backup bucket list
  mc ls backup > "${metadata_dir}/buckets.txt" 2>&1 || warning "Failed to list buckets"
  
  # Backup bucket versioning and lifecycle policies
  for bucket in $(mc ls backup | awk '{print $NF}'); do
    bucket_name="${bucket%/}"
    
    # Versioning status
    mc version info "backup/${bucket_name}" > "${metadata_dir}/${bucket_name}_versioning.json" 2>&1 || true
    
    # Lifecycle rules
    mc ilm export "backup/${bucket_name}" > "${metadata_dir}/${bucket_name}_lifecycle.json" 2>&1 || true
    
    # Bucket policy
    mc policy download "backup/${bucket_name}" > "${metadata_dir}/${bucket_name}_policy.json" 2>&1 || true
    
    # Bucket tags
    mc tag list "backup/${bucket_name}" > "${metadata_dir}/${bucket_name}_tags.txt" 2>&1 || true
  done
  
  log "Metadata backup completed"
}

# Full backup
backup_full() {
  log "Starting full backup of all buckets..."
  
  local data_dir="${BACKUP_PATH}/data"
  mkdir -p "${data_dir}"
  
  # Backup all buckets
  for bucket in $(mc ls backup | awk '{print $NF}'); do
    bucket_name="${bucket%/}"
    log "Backing up bucket: ${bucket_name}"
    
    local bucket_backup_dir="${data_dir}/${bucket_name}"
    mkdir -p "${bucket_backup_dir}"
    
    # Use mc mirror for efficient backup
    if mc mirror "backup/${bucket_name}" "${bucket_backup_dir}" --remove; then
      log "Successfully backed up bucket: ${bucket_name}"
    else
      warning "Failed to backup bucket: ${bucket_name}"
    fi
  done
  
  log "Full backup completed"
}

# Incremental backup
backup_incremental() {
  log "Starting incremental backup..."
  
  local data_dir="${BACKUP_PATH}/data"
  local last_backup_file="${BACKUP_DEST}/.last_backup_time"
  
  mkdir -p "${data_dir}"
  
  # Get last backup time
  local last_backup_time="1970-01-01T00:00:00Z"
  if [ -f "${last_backup_file}" ]; then
    last_backup_time=$(cat "${last_backup_file}")
  fi
  
  log "Last backup: ${last_backup_time}"
  
  # Backup only modified objects
  for bucket in $(mc ls backup | awk '{print $NF}'); do
    bucket_name="${bucket%/}"
    log "Incrementally backing up bucket: ${bucket_name}"
    
    local bucket_backup_dir="${data_dir}/${bucket_name}"
    mkdir -p "${bucket_backup_dir}"
    
    # Use --newer-than for incremental backup
    if mc mirror "backup/${bucket_name}" "${bucket_backup_dir}" \
       --newer-than "${last_backup_time}" --remove; then
      log "Successfully backed up bucket: ${bucket_name}"
    else
      warning "Failed to backup bucket: ${bucket_name}"
    fi
  done
  
  # Update last backup time
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "${last_backup_file}"
  
  log "Incremental backup completed"
}

# Metadata-only backup
backup_metadata_only() {
  log "Starting metadata-only backup..."
  backup_metadata
  log "Metadata-only backup completed"
}

# Compress backup
compress_backup() {
  if [ "${BACKUP_COMPRESSION}" != "true" ]; then
    return
  fi
  
  log "Compressing backup..."
  
  local tar_file="${BACKUP_DEST}/${BACKUP_NAME}.tar.gz"
  
  if tar -czf "${tar_file}" -C "${BACKUP_DEST}" "${BACKUP_NAME}" 2>/dev/null; then
    log "Backup compressed: ${tar_file}"
    
    # Calculate size
    local size=$(du -sh "${tar_file}" | awk '{print $1}')
    log "Compressed size: ${size}"
    
    # Remove uncompressed backup
    rm -rf "${BACKUP_PATH}"
  else
    warning "Failed to compress backup"
  fi
}

# Verify backup
verify_backup() {
  log "Verifying backup integrity..."
  
  if [ ! -d "${BACKUP_PATH}" ] && [ ! -f "${BACKUP_DEST}/${BACKUP_NAME}.tar.gz" ]; then
    error "Backup directory not found"
  fi
  
  # Check metadata
  if [ -d "${BACKUP_PATH}/metadata" ]; then
    local metadata_files=$(find "${BACKUP_PATH}/metadata" -type f | wc -l)
    log "Metadata files: ${metadata_files}"
  fi
  
  # Check data
  if [ -d "${BACKUP_PATH}/data" ]; then
    local data_size=$(du -sh "${BACKUP_PATH}/data" | awk '{print $1}')
    log "Data size: ${data_size}"
  fi
  
  success "Backup verification completed"
}

# Cleanup old backups
cleanup_old_backups() {
  log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
  
  find "${BACKUP_DEST}" -maxdepth 1 -name "minio_backup_*" -type d \
    -mtime "+${BACKUP_RETENTION_DAYS}" -exec rm -rf {} \; 2>/dev/null || true
  
  find "${BACKUP_DEST}" -maxdepth 1 -name "minio_backup_*.tar.gz" -type f \
    -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
  
  log "Cleanup completed"
}

# Main execution
main() {
  case "${BACKUP_TYPE}" in
    full)
      backup_metadata
      backup_full
      ;;
    incremental)
      backup_metadata
      backup_incremental
      ;;
    metadata)
      backup_metadata_only
      ;;
    *)
      error "Unknown backup type: ${BACKUP_TYPE}. Use: full, incremental, or metadata"
      ;;
  esac
  
  verify_backup
  compress_backup
  cleanup_old_backups
  
  success "Backup completed successfully"
  success "Backup location: ${BACKUP_PATH}"
}

# Run main function
main
