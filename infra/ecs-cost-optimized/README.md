# ElimuAI ECS Cost-Optimized Deployment

This setup deploys frontend and backend on AWS ECS using one ECS service with two containers:

- frontend container (nginx) serves static files and proxies `/api` to backend
- backend container (Node.js/Express)

## Why this is cost-optimized

- ARM64 task runtime (Graviton pricing)
- `FARGATE_SPOT` weighted above on-demand
- one ALB and one ECS service for both frontend and backend
- CloudWatch logs retention set to 7 days

## Files

- `infra/ecs-cost-optimized/stack.yaml`: CloudFormation stack
- `infra/ecs-cost-optimized/ecs.env.example`: env template for deployment
- `scripts/deploy-ecs-cost.sh`: build, push, and deploy script
- `frontend/Dockerfile`: production frontend image
- `frontend/nginx.conf`: frontend + API reverse proxy

## Deploy

1. Create env file:

```bash
cp infra/ecs-cost-optimized/ecs.env.example infra/ecs-cost-optimized/ecs.env
```

2. Fill required values in `infra/ecs-cost-optimized/ecs.env`.

3. Deploy:

```bash
npm run deploy:ecs
```

4. Copy `AlbUrl` output from script, set `FRONTEND_URL` to that value, and deploy once more:

```bash
npm run deploy:ecs
```

## Cost controls

- Maximum savings mode: set `ON_DEMAND_WEIGHT=0` and keep `SPOT_WEIGHT>0`
- More stable mode: keep `ON_DEMAND_WEIGHT=1` and `SPOT_WEIGHT=4`
- For non-production windows, set `DESIRED_COUNT=0` and redeploy

## Operational notes

- This stack expects external Postgres and Redis endpoints via `DATABASE_URL` and `REDIS_URL`.
- If you need fully AWS-managed data plane, use RDS + ElastiCache, but that increases fixed monthly cost.
- To terminate all costs: delete CloudFormation stack and remove ECR images/repositories.
