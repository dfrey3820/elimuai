#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-dfrey3820/elimuai}"
APP_ENV_PATH="${APP_ENV_PATH:-deploy/ec2/.env}"
EC2_SSH_KEY_PATH="${EC2_SSH_KEY_PATH:-}"
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required"
  exit 1
fi

if [[ ! -f "$APP_ENV_PATH" ]]; then
  echo "Missing $APP_ENV_PATH"
  echo "Create it from deploy/ec2/.env.example and fill real values."
  exit 1
fi

if [[ -z "$EC2_HOST" || -z "$EC2_USER" || -z "$EC2_SSH_KEY_PATH" ]]; then
  echo "Set required env vars before running:"
  echo "  EC2_HOST=<public-ip-or-dns>"
  echo "  EC2_USER=<ssh-user>"
  echo "  EC2_SSH_KEY_PATH=<path-to-private-key>"
  echo "Optional:"
  echo "  REPO=dfrey3820/elimuai"
  echo "  APP_ENV_PATH=deploy/ec2/.env"
  exit 1
fi

if [[ ! -f "$EC2_SSH_KEY_PATH" ]]; then
  echo "SSH key file not found: $EC2_SSH_KEY_PATH"
  exit 1
fi

echo "[secrets] Setting EC2_HOST"
gh secret set EC2_HOST -R "$REPO" --body "$EC2_HOST"

echo "[secrets] Setting EC2_USER"
gh secret set EC2_USER -R "$REPO" --body "$EC2_USER"

echo "[secrets] Setting EC2_SSH_KEY from file"
gh secret set EC2_SSH_KEY -R "$REPO" < "$EC2_SSH_KEY_PATH"

echo "[secrets] Setting APP_ENV_FILE from $APP_ENV_PATH"
gh secret set APP_ENV_FILE -R "$REPO" < "$APP_ENV_PATH"

echo "[secrets] Done"
gh secret list -R "$REPO"
