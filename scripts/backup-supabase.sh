#!/usr/bin/env bash
# ==============================================================================
# AEGGPEPP WORKSPACE — SUPABASE DAILY BACKUP SCRIPT WITH 7-DAY ROTATION
# Add to root crontab: 0 3 * * * /opt/aeggpepp/scripts/backup-supabase.sh >> /var/log/supabase-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/supabase"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql.gz"

# Load DB URL from env file if available
ENV_FILE="$(dirname "$0")/../services/whatsapp-bot/.env"
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
fi

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL or DATABASE_URL is not set in environment or $ENV_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "=================================================="
echo "⏳ [$(date)] Starting Supabase Database Dump..."

# Execute pg_dump and pipe directly into gzip
pg_dump "$DB_URL" --clean --if-exists --no-owner --no-privileges | gzip -9 > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ [$(date)] Backup successfully saved: ${BACKUP_FILE} (${FILE_SIZE})"

# Delete backups older than 7 days
echo "🧹 Cleaning backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "supabase_backup_*.sql.gz" -mtime +7 -exec rm -vf {} \;

echo "🎉 [$(date)] Backup and rotation complete!"
echo "=================================================="
