#!/usr/bin/env bash
# Deploy ElimuAI Python microservices to ECS Fargate.
#
# Prereqs:
#   * AWS CLI configured for account 977233000130
#   * Docker daemon running
#   * infra/ecs-fargate-py/prod.env exists (copy prod.env.example and fill values)
#
# Idempotent — safe to re-run for image updates. On first run: builds ECR
# repos, S3 buckets, EFS, ALB, ECS service. On subsequent runs: rebuilds
# images and forces a new task deployment.

set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────────────
: "${AWS_REGION:=eu-west-1}"
: "${PROJECT_NAME:=elimuai}"
: "${STACK_NAME:=${PROJECT_NAME}-fargate}"
: "${VPC_ID:=vpc-0f4a33b0e45f574f1}"
: "${PUBLIC_SUBNETS:=subnet-06ef9077f6e3c5314,subnet-0d7e057904efb1549,subnet-078ee7580d380c1d4}"
: "${CERT_ARN:=arn:aws:acm:eu-west-1:977233000130:certificate/8d90fa7e-504e-4a57-9b34-6c0c8ef754e2}"
: "${IMAGE_TAG:=$(date -u +%Y%m%d%H%M)}"
: "${DESIRED_COUNT:=1}"
: "${TASK_CPU:=1024}"
: "${TASK_MEMORY:=3072}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_DIR="${ROOT}/infra/ecs-fargate-py"
BACKEND_PY="${ROOT}/backend-py"
ENV_FILE="${INFRA_DIR}/prod.env"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CONFIG_BUCKET="${PROJECT_NAME}-config-${AWS_ACCOUNT_ID}"
UPLOADS_BUCKET="${PROJECT_NAME}-uploads-${AWS_ACCOUNT_ID}"

SERVICES=(auth-service users-service schools-service billing-service
          learning-service admin-service notifications-service)

log() { echo -e "\033[1;36m▶ $*\033[0m"; }
die() { echo -e "\033[1;31m✖ $*\033[0m" >&2; exit 1; }

# ─── Preflight ──────────────────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy prod.env.example and fill values"
docker info >/dev/null 2>&1 || die "Docker daemon is not running"

log "Account=$AWS_ACCOUNT_ID  Region=$AWS_REGION  Tag=$IMAGE_TAG"

# ─── 1. ECR repositories ────────────────────────────────────────────────────
log "Ensuring ECR repos"
for svc in "${SERVICES[@]}" gateway; do
  aws ecr describe-repositories --repository-names "${PROJECT_NAME}/${svc}" \
    --region "$AWS_REGION" >/dev/null 2>&1 \
    || aws ecr create-repository \
        --repository-name "${PROJECT_NAME}/${svc}" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 >/dev/null
done

log "Logging in to ECR"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# ─── 2. Build + push images ─────────────────────────────────────────────────
log "Building Python services (7 images)"
for svc in "${SERVICES[@]}"; do
  IMG="${ECR_REGISTRY}/${PROJECT_NAME}/${svc}"
  log "  build $svc"
  docker build \
    --platform linux/amd64 \
    -t "${IMG}:${IMAGE_TAG}" -t "${IMG}:latest" \
    -f "${BACKEND_PY}/services/Dockerfile" \
    --build-arg SERVICE="$svc" \
    "${BACKEND_PY}"
  log "  push $svc"
  docker push "${IMG}:${IMAGE_TAG}"
  docker push "${IMG}:latest"
done

log "Building gateway (nginx + static frontend)"
GW_IMG="${ECR_REGISTRY}/${PROJECT_NAME}/gateway"
# Build context is the repo root so the Dockerfile can COPY both backend-py/gateway/*
# and frontend/* in a single build.
docker build \
  --platform linux/amd64 \
  -t "${GW_IMG}:${IMAGE_TAG}" -t "${GW_IMG}:latest" \
  -f "${BACKEND_PY}/gateway/Dockerfile.prod" \
  "${ROOT}"
docker push "${GW_IMG}:${IMAGE_TAG}"
docker push "${GW_IMG}:latest"

# ─── 3. S3 buckets (config + uploads) ───────────────────────────────────────
log "Ensuring config S3 bucket: $CONFIG_BUCKET"
if ! aws s3api head-bucket --bucket "$CONFIG_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$CONFIG_BUCKET" --region "$AWS_REGION" >/dev/null
  else
    aws s3api create-bucket --bucket "$CONFIG_BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  fi
  aws s3api put-bucket-encryption --bucket "$CONFIG_BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$CONFIG_BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

log "Ensuring uploads S3 bucket: $UPLOADS_BUCKET"
if ! aws s3api head-bucket --bucket "$UPLOADS_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$UPLOADS_BUCKET" --region "$AWS_REGION" >/dev/null
  else
    aws s3api create-bucket --bucket "$UPLOADS_BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  fi
  # Uploads bucket: public objects OK (per storage.py which sets public-read)
  aws s3api put-public-access-block --bucket "$UPLOADS_BUCKET" \
    --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
  # Read-only public policy on objects
  cat > /tmp/uploads-policy.json <<POL
{"Version":"2012-10-17","Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::${UPLOADS_BUCKET}/*"}]}
POL
  aws s3api put-bucket-policy --bucket "$UPLOADS_BUCKET" --policy file:///tmp/uploads-policy.json
  # Basic CORS so browsers can PUT signed uploads if we add them later
  cat > /tmp/uploads-cors.json <<COR
{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","HEAD"],"AllowedOrigins":["*"],"MaxAgeSeconds":3600}]}
COR
  aws s3api put-bucket-cors --bucket "$UPLOADS_BUCKET" --cors-configuration file:///tmp/uploads-cors.json
fi

# ─── 4. Upload env file ─────────────────────────────────────────────────────
log "Uploading env file to s3://${CONFIG_BUCKET}/env/prod.env"
aws s3 cp "$ENV_FILE" "s3://${CONFIG_BUCKET}/env/prod.env" \
  --sse AES256 --content-type text/plain

# ─── 5. Deploy CloudFormation ───────────────────────────────────────────────
log "Deploying CloudFormation stack: $STACK_NAME"
aws cloudformation deploy \
  --template-file "${INFRA_DIR}/stack.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      ProjectName="$PROJECT_NAME" \
      VpcId="$VPC_ID" \
      PublicSubnets="$PUBLIC_SUBNETS" \
      CertificateArn="$CERT_ARN" \
      ImageTag="$IMAGE_TAG" \
      EcrAccount="$AWS_ACCOUNT_ID" \
      AwsRegion="$AWS_REGION" \
      ConfigBucketName="$CONFIG_BUCKET" \
      UploadsBucketName="$UPLOADS_BUCKET" \
      DesiredCount="$DESIRED_COUNT" \
      TaskCpu="$TASK_CPU" \
      TaskMemory="$TASK_MEMORY" \
  --no-fail-on-empty-changeset

# ─── 6. Force new deployment (in case only images changed) ──────────────────
CLUSTER=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text)
SVC=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' --output text)
ALB_DNS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`AlbDnsName`].OutputValue' --output text)

log "Forcing new deployment"
aws ecs update-service --cluster "$CLUSTER" --service "$SVC" \
  --region "$AWS_REGION" --force-new-deployment --output text >/dev/null

log "Deployment kicked off."
cat <<EOF

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Stack:            $STACK_NAME
  │  Cluster:          $CLUSTER
  │  Service:          $SVC
  │  ALB DNS:          $ALB_DNS
  │  Config bucket:    s3://$CONFIG_BUCKET
  │  Uploads bucket:   s3://$UPLOADS_BUCKET
  │  Image tag:        $IMAGE_TAG
  └─────────────────────────────────────────────────────────────────────┘

Next steps:
  1. Watch rollout:
       aws ecs wait services-stable --cluster $CLUSTER --services $SVC --region $AWS_REGION
  2. Add a CNAME (or Route 53 A-alias) for venus.elimuai.africa → $ALB_DNS
  3. Restore data:
       ./scripts/deploy-ecs-fargate.sh --restore <path/to/backup.sql.gz>
EOF
