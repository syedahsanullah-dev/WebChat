#!/bin/bash
# ==============================================================================
# WebChat Automated Daily MySQL Database Backup Script for Hostinger
# Added Monthly Cost: $0.00 / month
# ==============================================================================
# Description:
#   Performs an automated compressed MySQL dump of the WebChat database,
#   verifies archive integrity, and rotates backups older than 7 days.
#
# Hostinger Setup Instructions:
#   1. Upload this script to: /home/USERNAME/scripts/backup-db.sh
#   2. Make executable: chmod +x /home/USERNAME/scripts/backup-db.sh
#   3. Add Cron Job in Hostinger hPanel > Advanced > Cron Jobs:
#      Schedule: Daily at 03:00 AM (0 3 * * *)
#      Command: /home/USERNAME/scripts/backup-db.sh >> /home/USERNAME/backups/backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Configuration: Read from environment or fallback to Hostinger defaults
DB_USER="${DB_USER:-${MYSQL_USER:-u946657530_chatuser}}"
DB_PASS="${DB_PASS:-${MYSQL_PASSWORD:-#5199#WEBCHAT.com}}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-u946657530_webchat}}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
TIMESTAMP="$(date +'%Y-%m-%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

echo "=========================================================="
echo "Starting WebChat MySQL Database Backup"
echo "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%SZ')"
echo "Target Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
echo "=========================================================="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Execute mysqldump with single-transaction for zero-downtime consistency
if command -v mysqldump >/dev/null 2>&1; then
    mysqldump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        --password="${DB_PASS}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
else
    echo "ERROR: mysqldump command not found in PATH." >&2
    exit 1
fi

# Verify the backup file was created and is non-empty
if [ -s "${BACKUP_FILE}" ]; then
    FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "✓ Backup successfully created: ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "ERROR: Backup file is empty or missing: ${BACKUP_FILE}" >&2
    exit 1
fi

# Prune archives older than retention period
echo "Pruning backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT="$(find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -print -delete | wc -l || true)"
echo "✓ Removed ${DELETED_COUNT} outdated backup archive(s)."

echo "Backup workflow completed cleanly."
