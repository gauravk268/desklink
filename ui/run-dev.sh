#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

cleanup() {
  echo ""
  echo "Shutting down DeskLink API and UI..."
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill -TERM "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$UI_PID" ] && kill -0 "$UI_PID" 2>/dev/null; then
    kill -TERM "$UI_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  echo "All processes stopped cleanly."
  exit 0
}

trap cleanup INT TERM EXIT

# Start API
(cd "$DIR/../desk-gadget" && exec .venv/bin/python3 app.py) &
API_PID=$!

# Start Vite UI
npx vite --host &
UI_PID=$!

wait -n $API_PID $UI_PID 2>/dev/null || true
cleanup
