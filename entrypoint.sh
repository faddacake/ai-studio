#!/bin/sh
set -e

echo "[entrypoint] Starting AI Studio..."

# Ensure data directories exist
mkdir -p /data/db /data/assets /data/config

# Start Next.js server (Process 1)
echo "[entrypoint] Starting Next.js server..."
cd apps/web && node ../../node_modules/next/dist/bin/next start -p 3000 &
NEXTJS_PID=$!

# Start BullMQ worker (Process 2)
echo "[entrypoint] Starting BullMQ worker..."
node packages/worker/dist/index.js &
WORKER_PID=$!

echo "[entrypoint] Both processes started (Next.js=$NEXTJS_PID, Worker=$WORKER_PID)"

# POSIX-safe waiting (no wait -n in /bin/sh on Debian)
NEXT_EXIT=0
WORKER_EXIT=0

wait "$NEXTJS_PID" || NEXT_EXIT=$?
wait "$WORKER_PID" || WORKER_EXIT=$?

# Prefer the first non-zero exit code (if any)
EXIT_CODE=$NEXT_EXIT
if [ "$EXIT_CODE" -eq 0 ]; then
  EXIT_CODE=$WORKER_EXIT
fi

echo "[entrypoint] Processes exited (Next.js=$NEXT_EXIT, Worker=$WORKER_EXIT). Exiting with $EXIT_CODE"
exit "$EXIT_CODE"
