#!/usr/bin/env bash
set -euo pipefail

echo "[Restore Script Wrapper] Running database restore..."
npx tsx scripts/restore.ts "$@"
echo "[Restore Script Wrapper] Restore operation finished successfully."
