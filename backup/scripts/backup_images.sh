#!/bin/sh
# Monthly backup of the img directory (keep last 3 archives)
TIMESTAMP=$(date +%Y%m)
BACKUP_FILE="/backups/img_${TIMESTAMP}.tar.gz"
# Create tar.gz of the image directory (mounted at /data/img)
 tar -czf "$BACKUP_FILE" -C /data/img .
# Retention: keep only the latest 3 archives
ls -1t /backups/img_*.tar.gz | tail -n +4 | xargs -r rm --
