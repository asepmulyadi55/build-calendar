#!/usr/bin/env bash
# Nightly Supabase backup to R2. Run from cron on the Lightsail instance.
#
# The database holds a coin ledger — that is customer money — and the Supabase
# free tier has no daily backups (`01-…` §3.4). Two rules that are easy to skip
# and expensive to skip:
#   1. The backup bucket and its credentials are SEPARATE from the app's.
#   2. Restore one of these before accepting a real payment. A backup that has
#      never been restored is a hypothesis, not a backup.
#
# Cron example (03:15 Asia/Jakarta):
#   15 3 * * * /opt/buildcalendar/infra/backup.sh >> /var/log/bc-backup.log 2>&1

set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/buildcalendar/.env}"
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

: "${DIRECT_URL:?DIRECT_URL is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_BACKUP_BUCKET:?R2_BACKUP_BUCKET is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$(mktemp -d)"
DUMP="$WORK_DIR/buildcalendar-$STAMP.dump"

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

echo "[backup] dumping to $DUMP"
# Custom format (-Fc) so a partial-table restore is possible. Migrations use the
# direct connection, and so does this — the pooler is not suitable for pg_dump.
pg_dump --format=custom --no-owner --no-privileges --dbname="$DIRECT_URL" --file="$DUMP"

SIZE=$(stat -c%s "$DUMP")
echo "[backup] dump size ${SIZE} bytes"
if [ "$SIZE" -lt 10240 ]; then
  echo "[backup] FAILED: dump is implausibly small, refusing to upload" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "[backup] uploading to r2://$R2_BACKUP_BUCKET/db/"
aws s3 cp "$DUMP" "s3://$R2_BACKUP_BUCKET/db/$(basename "$DUMP")" \
  --endpoint-url "$ENDPOINT" --only-show-errors

CUTOFF=$(date -u -d "$RETENTION_DAYS days ago" +%Y%m%d)
echo "[backup] pruning objects older than $CUTOFF"
aws s3 ls "s3://$R2_BACKUP_BUCKET/db/" --endpoint-url "$ENDPOINT" \
  | awk '{print $4}' \
  | while read -r key; do
      [ -z "$key" ] && continue
      stamp="${key#buildcalendar-}"
      stamp="${stamp%%T*}"
      case "$stamp" in
        ''|*[!0-9]*) continue ;;
      esac
      if [ "$stamp" -lt "$CUTOFF" ]; then
        echo "[backup] deleting $key"
        aws s3 rm "s3://$R2_BACKUP_BUCKET/db/$key" --endpoint-url "$ENDPOINT" --only-show-errors
      fi
    done

echo "[backup] done"
