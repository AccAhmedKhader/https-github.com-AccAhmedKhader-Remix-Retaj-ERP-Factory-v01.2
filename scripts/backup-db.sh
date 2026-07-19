#!/usr/bin/env bash
set -euo pipefail

echo "[Backup Script Wrapper] Running database backup..."
npx tsx scripts/backup.ts
echo "[Backup Script Wrapper] Backup operation finished successfully."
