#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required"
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required"
  exit 1
fi

ENV_FILE="${ENV_FILE:-infra/ecs-cost-optimized/ecs.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy infra/ecs-cost-optimized/ecs.env.example first."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

required=(AWS_REGION PROJECT_NAME STACK_NAME DATABASE_URL REDIS_URL JWT_SECRET ANTHROPIC_API_KEY FRONTEND_URL)
for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required variable: $var"
    exit 1
  fi
done

DESIRED_COUNT="${DESIRED_COUNT:-1}"
TASK_CPU="${TASK_CPU:-512}"
TASK_MEMORY="${TASK_MEMORY:-1024}"
SPOT_WEIGHT="${SPOT_WEIGHT:-4}"
ON_DEMAND_WEIGHT="${ON_DEMAND_WEIGHT:-1}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
FRONTEND_REPO="${PROJECT_NAME}-frontend"
BACKEND_REPO="${PROJECT_NAME}-backend"
IMAGE_TAG="$(date +%Y%m%d%H%M%S)"

ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FRONTEND_IMAGE="${ECR_BASE}/${FRONTEND_REPO}:${IMAGE_TAG}"
BACKEND_IMAGE="${ECR_BASE}/${BACKEND_REPO}:${IMAGE_TAG}"

create_repo_if_missing() {
  local repo="$1"
  if ! aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" >/dev/null 2>&1; then
    aws ecr create-repository \
      --repository-name "$repo" \
      --image-scanning-configuration scanOnPush=true \
      --region "$AWS_REGION" >/dev/null
  fi
}

echo "[deploy] Ensuring ECR repositories exist..."
create_repo_if_missing "$FRONTEND_REPO"
create_repo_if_missing "$BACKEND_REPO"

echo "[deploy] Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_BASE"

echo "[deploy] Building and pushing backend image: $BACKEND_IMAGE"
docker build --platform linux/arm64 -f Dockerfile -t "$BACKEND_IMAGE" .
docker push "$BACKEND_IMAGE"

echo "[deploy] Building and pushing frontend image: $FRONTEND_IMAGE"
docker build --platform linux/arm64 -f frontend/Dockerfile -t "$FRONTEND_IMAGE" .
docker push "$FRONTEND_IMAGE"

VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text --region "$AWS_REGION")"
if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  echo "No default VPC found. Provide VPC/Subnets manually in stack deployment."
  exit 1
fi

SUBNETS="$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" Name=default-for-az,Values=true --query 'Subnets[].SubnetId' --output text --region "$AWS_REGION")"
if [[ -z "$SUBNETS" ]]; then
  echo "No default subnets found in default VPC."
  exit 1
fi

echo "[deploy] Deploying CloudFormation stack: $STACK_NAME"
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file infra/ecs-cost-optimized/stack.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    ProjectName="$PROJECT_NAME" \
    VpcId="$VPC_ID" \
    PublicSubnets="$SUBNETS" \
    FrontendImage="$FRONTEND_IMAGE" \
    BackendImage="$BACKEND_IMAGE" \
    DesiredCount="$DESIRED_COUNT" \
    TaskCpu="$TASK_CPU" \
    TaskMemory="$TASK_MEMORY" \
    SpotWeight="$SPOT_WEIGHT" \
    OnDemandWeight="$ON_DEMAND_WEIGHT" \
    FrontendUrl="$FRONTEND_URL" \
    DatabaseUrl="$DATABASE_URL" \
    RedisUrl="$REDIS_URL" \
    JwtSecret="$JWT_SECRET" \
    AnthropicApiKey="$ANTHROPIC_API_KEY"

ALB_URL="$(aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`AlbUrl`].OutputValue' --output text)"

echo "[deploy] Done."
echo "[deploy] ALB URL: $ALB_URL"
echo "[deploy] Next: set FRONTEND_URL=$ALB_URL in $ENV_FILE and run this script once more so CORS matches production URL."
