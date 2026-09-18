#!/usr/bin/env bash
# Create or update the AWS Secrets Manager secret holding the external payment
# gateway credentials. ECS resolves this secret at task startup and injects the
# values as PAYMENT_GATEWAY_API_KEY / PAYMENT_GATEWAY_API_SECRET env vars into
# the billing-service container (see infra/ecs-fargate-py/stack.yaml).
#
# Usage:
#   ./scripts/set-payment-gateway-secret.sh <API_KEY> <API_SECRET>
#
# Reads from stdin if arguments are omitted (safer — no shell history leak):
#   ./scripts/set-payment-gateway-secret.sh
#     API key: ****
#     API secret: ****
#
# After running, export the printed ARN and re-deploy:
#   export PAYMENT_GATEWAY_SECRET_ARN=<arn>
#   ./scripts/deploy-ecs-fargate.sh

set -euo pipefail

: "${AWS_REGION:=eu-west-1}"
: "${SECRET_NAME:=elimuai/payment-gateway}"

API_KEY="${1:-}"
API_SECRET="${2:-}"

if [[ -z "$API_KEY" ]]; then
  read -rs -p "Payment gateway API key: " API_KEY; echo
fi
if [[ -z "$API_SECRET" ]]; then
  read -rs -p "Payment gateway API secret: " API_SECRET; echo
fi

[[ -n "$API_KEY" && -n "$API_SECRET" ]] || { echo "API key and secret are required" >&2; exit 1; }

# Build the JSON payload with jq so special characters are escaped correctly.
if ! command -v jq >/dev/null; then
  echo "jq is required. Install with: brew install jq" >&2; exit 1
fi
SECRET_JSON=$(jq -n --arg k "$API_KEY" --arg s "$API_SECRET" \
  '{PAYMENT_GATEWAY_API_KEY:$k, PAYMENT_GATEWAY_API_SECRET:$s}')

if aws secretsmanager describe-secret \
     --secret-id "$SECRET_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "▶ Updating existing secret: $SECRET_NAME"
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_REGION" >/dev/null
else
  echo "▶ Creating new secret: $SECRET_NAME"
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "External payment gateway (venus.elimuai.africa) API credentials for billing-service" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_REGION" >/dev/null
fi

ARN=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" --region "$AWS_REGION" \
  --query ARN --output text)

cat <<EOF

✓ Secret stored.

  ARN: $ARN

Next steps:
  export PAYMENT_GATEWAY_SECRET_ARN='$ARN'
  ./scripts/deploy-ecs-fargate.sh

To rotate the credentials later, re-run this script — the ARN stays the same
so no CloudFormation redeploy is required (ECS will pick up the new value on
the next task restart).
EOF
