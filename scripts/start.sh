#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server/nerf-proxy"

echo "[start] Ensuring Python venv..."
python3 -m venv "$SERVER_DIR/.venv" >/dev/null 2>&1 || true
source "$SERVER_DIR/.venv/bin/activate"
pip install --upgrade pip >/dev/null
pip install -r "$SERVER_DIR/requirements.txt" >/dev/null

echo "[start] Launching NeRF proxy on :7007..."
uvicorn main:app --host 0.0.0.0 --port 7007 --app-dir "$SERVER_DIR" &
UVICORN_PID=$!

cleanup() {
  echo "[start] Shutting down NeRF proxy (pid=$UVICORN_PID)..."
  kill "$UVICORN_PID" >/dev/null 2>&1 || true
  wait "$UVICORN_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "[start] Starting Vite dev server..."
cd "$ROOT_DIR"
vite

