#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[dev-local] Starting backend stack (postgres, redis, api) via Docker Compose..."
docker-compose up -d --build postgres redis backend

echo "[dev-local] Ensuring frontend dependencies are installed..."
if [ ! -d "frontend/node_modules" ]; then
  npm --prefix frontend install
fi

echo "[dev-local] Starting frontend on http://localhost:3000"
exec npm --prefix frontend run dev -- --host 0.0.0.0 --port 3000
