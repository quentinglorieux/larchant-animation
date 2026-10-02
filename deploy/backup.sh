#!/usr/bin/env bash
# Sauvegarde quotidienne : dump Postgres + médias Directus, conservation 14 jours.
set -euo pipefail
cd /root/larchant-animation
DEST=/root/backups/larchant
mkdir -p "$DEST"
STAMP=$(date +%F)
set -a; . ./.env; set +a
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DEST/db-$STAMP.sql.gz"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C directus uploads
find "$DEST" -type f -mtime +14 -delete
