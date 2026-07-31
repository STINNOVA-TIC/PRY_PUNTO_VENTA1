#!/bin/sh
# Weekly backup of the PostgreSQL database
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/db_${TIMESTAMP}.dump"

echo "Starting database backup..."

# Export password for pg_dump
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Execute pg_dump in custom format (-F c) which is compressed and flexible
pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup finished successfully: $BACKUP_FILE"
else
  echo "Error: Database backup failed." >&2
  exit 1
fi

# Retention policy: keep only the latest 4 backups (e.g. 4 weeks)
ls -1t /backups/db_*.dump | tail -n +5 | xargs -r rm --
echo "Retention policy cleanup completed."
