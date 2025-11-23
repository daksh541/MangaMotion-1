#!/bin/bash

# MangaMotion Database Backup and Restore Script
# Handles database backups, file storage backups, and restoration procedures

set -e

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.local"
BACKUP_DIR="./backups"
RETENTION_DAYS=30
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-mangamotion-backups-prod}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Create backup directory
ensure_backup_dir() {
    local date=$(date '+%Y%m%d')
    local backup_path="$BACKUP_DIR/$date"

    if [[ ! -d "$backup_path" ]]; then
        mkdir -p "$backup_path"
        log "INFO" "Created backup directory: $backup_path"
    fi

    echo "$backup_path"
}

# Get database credentials from environment
get_db_credentials() {
    if [[ -f "$ENV_FILE" ]]; then
        DB_USER=$(grep -E "^DB_USER=" "$ENV_FILE" | cut -d'=' -f2)
        DB_PASSWORD=$(grep -E "^DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
        DB_NAME=$(grep -E "^DB_NAME=" "$ENV_FILE" | cut -d'=' -f2)
    else
        log "ERROR" "Environment file not found: $ENV_FILE"
        exit 1
    fi

    if [[ -z "$DB_USER" ]] || [[ -z "$DB_PASSWORD" ]] || [[ -z "$DB_NAME" ]]; then
        log "ERROR" "Database credentials not found in environment file"
        exit 1
    fi
}

# Backup PostgreSQL database
backup_database() {
    local backup_path=$1
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$backup_path/database_${timestamp}.sql.gz"

    log "INFO" "Starting database backup..."

    get_db_credentials

    # Create database backup
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --no-acl \
        --no-owner \
        --format=custom \
        --compress=9 \
        | gzip > "$backup_file"; then

        local file_size=$(du -h "$backup_file" | cut -f1)
        log "INFO" "✓ Database backup completed: $backup_file (${file_size})"

        # Verify backup
        if [[ -s "$backup_file" ]]; then
            log "INFO" "✓ Backup file is not empty"
        else
            log "ERROR" "✗ Backup file is empty"
            rm -f "$backup_file"
            return 1
        fi

        echo "$backup_file"
        return 0
    else
        log "ERROR" "✗ Database backup failed"
        return 1
    fi
}

# Backup MinIO data
backup_minio() {
    local backup_path=$1
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$backup_path/minio_${timestamp}.tar.gz"

    log "INFO" "Starting MinIO backup..."

    # Get MinIO credentials
    if [[ -f "$ENV_FILE" ]]; then
        MINIO_ACCESS_KEY=$(grep -E "^MINIO_ACCESS_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        MINIO_SECRET_KEY=$(grep -E "^MINIO_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        MINIO_BUCKET=$(grep -E "^MINIO_BUCKET=" "$ENV_FILE" | cut -d'=' -f2)
    fi

    if [[ -z "$MINIO_ACCESS_KEY" ]] || [[ -z "$MINIO_SECRET_KEY" ]] || [[ -z "$MINIO_BUCKET" ]]; then
        log "WARN" "MinIO credentials not found, skipping MinIO backup"
        return 0
    fi

    # Create MinIO backup using mc (MinIO Client)
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio sh -c "
        if command -v mc &> /dev/null; then
            mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
            mc mirror local/$MINIO_BUCKET /tmp/minio_backup
            tar -czf /tmp/minio_backup.tar.gz -C /tmp minio_backup
            rm -rf /tmp/minio_backup
        else
            tar -czf /tmp/minio_backup.tar.gz -C /data . 2>/dev/null || true
        fi
    " && docker cp "$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q minio):/tmp/minio_backup.tar.gz" "$backup_file"; then

        local file_size=$(du -h "$backup_file" | cut -f1)
        log "INFO" "✓ MinIO backup completed: $backup_file (${file_size})"
        echo "$backup_file"
        return 0
    else
        log "WARN" "MinIO backup failed or not available"
        return 1
    fi
}

# Backup application configuration
backup_config() {
    local backup_path=$1
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$backup_path/config_${timestamp}.tar.gz"

    log "INFO" "Starting configuration backup..."

    # Create backup of configuration files
    if tar -czf "$backup_file" \
        --exclude='.env.local' \
        --exclude='backups' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='tmp*' \
        --exclude='*.pid' \
        -C "." \
        docker-compose.prod.yml \
        .env.production \
        mangamotion/deployments/ \
        scripts/ \
        cypress.config.js; then

        local file_size=$(du -h "$backup_file" | cut -f1)
        log "INFO" "✓ Configuration backup completed: $backup_file (${file_size})"
        echo "$backup_file"
        return 0
    else
        log "ERROR" "✗ Configuration backup failed"
        return 1
    fi
}

# Upload backup to S3/MinIO
upload_to_s3() {
    local backup_file=$1
    local s3_key="backups/$(basename "$backup_file")"

    if command -v aws &> /dev/null && [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
        log "INFO" "Uploading backup to S3: $s3_key"

        if aws s3 cp "$backup_file" "s3://$S3_BACKUP_BUCKET/$s3_key" --storage-class STANDARD_IA; then
            log "INFO" "✓ Backup uploaded to S3"
            return 0
        else
            log "ERROR" "✗ Failed to upload backup to S3"
            return 1
        fi
    else
        log "WARN" "AWS CLI not configured, skipping S3 upload"
        return 1
    fi
}

# List available backups
list_backups() {
    log "INFO" "Available backups:"

    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" | sort -r | while read -r backup; do
            local file_size=$(du -h "$backup" | cut -f1)
            local file_date=$(stat -c %y "$backup" 2>/dev/null || stat -f %Sm "$backup" 2>/dev/null)
            echo "  $backup ($file_size, $file_date)"
        done
    else
        log "WARN" "Backup directory not found: $BACKUP_DIR"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than $RETENTION_DAYS days..."

    if [[ -d "$BACKUP_DIR" ]]; then
        local deleted_count=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
        log "INFO" "Deleted $deleted_count old backup files"
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1

    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        exit 1
    fi

    log "WARN" "This will overwrite the current database. Are you sure? (y/N)"
    read -r confirmation

    if [[ "$confirmation" != "y" ]] && [[ "$confirmation" != "Y" ]]; then
        log "INFO" "Database restore cancelled"
        exit 0
    fi

    get_db_credentials

    log "INFO" "Restoring database from: $backup_file"

    # Stop application services during restore
    log "INFO" "Stopping application services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop backend worker

    # Restore database
    if gunzip -c "$backup_file" | docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres psql \
        -U "$DB_USER" \
        -d "$DB_NAME"; then

        log "INFO" "✓ Database restore completed"

        # Restart services
        log "INFO" "Restarting application services..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" start backend worker

        # Verify restore
        sleep 10
        log "INFO" "Verifying database restore..."
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend node ../scripts/check-db.js; then
            log "INFO" "✓ Database restore verification successful"
        else
            log "ERROR" "✗ Database restore verification failed"
            return 1
        fi
    else
        log "ERROR" "✗ Database restore failed"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1

    log "INFO" "Verifying backup: $backup_file"

    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi

    # Check file size
    local file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null)
    if [[ $file_size -lt 1000 ]]; then
        log "ERROR" "Backup file too small: ${file_size} bytes"
        return 1
    fi

    # Check if it's a valid gzip file
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log "ERROR" "Backup file is corrupted (invalid gzip)"
            return 1
        fi
    fi

    # Check if it's a valid tar.gz file
    if [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
            log "ERROR" "Backup file is corrupted (invalid tar.gz)"
            return 1
        fi
    fi

    log "INFO" "✓ Backup file integrity verified"
    return 0
}

# Create backup manifest
create_manifest() {
    local backup_path=$1
    local manifest_file="$backup_path/manifest.json"
    local timestamp=$(date -Iseconds)

    log "INFO" "Creating backup manifest: $manifest_file"

    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$timestamp",
  "backup_type": "production",
  "environment": "$NODE_ENV",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "hostname": "$(hostname)",
  "backup_files": [
EOF

    # Add backup files to manifest
    local first=true
    for file in "$backup_path"/*.{sql.gz,tar.gz}; do
        if [[ -f "$file" ]]; then
            if [[ "$first" == false ]]; then
                echo "," >> "$manifest_file"
            fi
            local filename=$(basename "$file")
            local file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
            local file_hash=$(sha256sum "$file" | cut -d' ' -f1)

            cat >> "$manifest_file" << EOF
    {
      "filename": "$filename",
      "size": $file_size,
      "sha256": "$file_hash",
      "type": "$(basename "$file" | cut -d'_' -f1)"
    }
EOF
            first=false
        fi
    done

    cat >> "$manifest_file" << EOF
  ],
  "configuration": {
    "retention_days": $RETENTION_DAYS,
    "backup_method": "automated"
  }
}
EOF

    log "INFO" "✓ Backup manifest created"
}

# Main backup function
perform_backup() {
    log "INFO" "Starting comprehensive backup..."

    local backup_path=$(ensure_backup_dir)
    local backup_files=()

    # Backup database
    local db_backup=$(backup_database "$backup_path")
    if [[ -n "$db_backup" ]]; then
        backup_files+=("$db_backup")
    fi

    # Backup MinIO data
    local minio_backup=$(backup_minio "$backup_path")
    if [[ -n "$minio_backup" ]]; then
        backup_files+=("$minio_backup")
    fi

    # Backup configuration
    local config_backup=$(backup_config "$backup_path")
    if [[ -n "$config_backup" ]]; then
        backup_files+=("$config_backup")
    fi

    # Create manifest
    create_manifest "$backup_path"

    # Upload to S3
    for backup_file in "${backup_files[@]}"; do
        upload_to_s3 "$backup_file" &
    done

    # Wait for uploads to complete
    wait

    # Cleanup old backups
    cleanup_old_backups

    log "INFO" "✓ Backup completed successfully"
    log "INFO" "Backup location: $backup_path"
    log "INFO" "Backup files: ${#backup_files[@]} created"

    return 0
}

# Show usage information
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup          Perform full backup (database + files + config)"
    echo "  restore FILE    Restore database from backup file"
    echo "  list           List available backups"
    echo "  verify FILE    Verify backup file integrity"
    echo "  cleanup        Clean old backups"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_DIR     - Backup directory (default: ./backups)"
    echo "  RETENTION_DAYS - Days to keep backups (default: 30)"
    echo "  S3_BACKUP_BUCKET - S3 bucket for offsite backups"
    echo "  AWS_ACCESS_KEY_ID - AWS access key"
    echo "  AWS_SECRET_ACCESS_KEY - AWS secret key"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore ./backups/20231123/database_20231123_120000.sql.gz"
    echo "  $0 list"
}

# Main execution
main() {
    case "${1:-}" in
        "backup")
            perform_backup
            ;;
        "restore")
            if [[ -z "${2:-}" ]]; then
                log "ERROR" "Please specify backup file to restore"
                show_usage
                exit 1
            fi
            restore_database "$2"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            if [[ -z "${2:-}" ]]; then
                log "ERROR" "Please specify backup file to verify"
                show_usage
                exit 1
            fi
            verify_backup "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "")
            log "ERROR" "Please specify a command"
            show_usage
            exit 1
            ;;
        *)
            log "ERROR" "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Check if running with docker-compose available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log "ERROR" "Docker Compose is required but not available"
    exit 1
fi

# Run main function
main "$@"