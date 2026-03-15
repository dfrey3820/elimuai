#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/elimuai}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env"
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [[ -z "${BACKEND_IMAGE:-}" || -z "${FRONTEND_IMAGE:-}" ]]; then
  echo "BACKEND_IMAGE and FRONTEND_IMAGE are required in .env"
  exit 1
fi

echo "[deploy] Pulling latest images"
docker compose -f docker-compose.prod.yml pull

echo "[deploy] Rolling update"
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "[deploy] Pruning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "[deploy] Done"
