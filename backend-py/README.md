# ElimuAI Python Backend (Microservices)

FastAPI + Python 3.12 rewrite of the Node monolith at [../backend](../backend), split into 7 services.

## Services

| Service | Port | Owns | Routes |
|---|---|---|---|
| [auth-service](services/auth-service) | 5100 | users, otp_tokens, refresh_tokens, user_sessions | `/api/auth/*` |
| [users-service](services/users-service) | 5101 | parent_children, user profile ops | `/api/users/*`, `/api/children` |
| [schools-service](services/schools-service) | 5102 | schools, classes, class_students, onboarding | `/api/schools/*`, `/api/onboarding/*` |
| [billing-service](services/billing-service) | 5103 | payments, invoices, coupons, coupon_usages | `/api/payments/*`, `/api/coupons/*` |
| [learning-service](services/learning-service) | 5104 | subjects, ai_sessions, exam_attempts, progress, leaderboard | `/api/ai/*`, `/api/progress/*`, `/api/leaderboard/*` |
| [admin-service](services/admin-service) | 5105 | settings, admin dashboard, user management | `/api/admin/*` |
| [notifications-service](services/notifications-service) | 5106 | email + SMS worker (BullMQ consumer, no HTTP routes) | — |

The [mpesa-service](../mpesa-service) (Node) stays as-is; [billing-service](services/billing-service) talks to it over the existing BullMQ `payment-requests` / `payment-results` queues.

## Architecture

```
Next.js frontend
      │
      ▼
nginx gateway  (validates JWT, injects X-User-Id / X-User-Role)
      │
      ├─► auth-service ──────► Postgres (users, otp_tokens, refresh_tokens, user_sessions)
      ├─► users-service
      ├─► schools-service
      ├─► billing-service ──► BullMQ ──► mpesa-service (Node, unchanged)
      ├─► learning-service
      ├─► admin-service
      └─► notifications-service (worker only, consumes 'notifications' queue)

Redis: BullMQ queues + rate-limit + leaderboard cache
Postgres: shared cluster, one schema per service (see below)
```

## Database topology

Shared Postgres cluster. Each service owns a logical group of tables. During the transition
period, all tables stay in the `public` schema so the Node backend keeps working. Once the
Node backend is decommissioned, tables can be moved to per-service schemas via
`ALTER TABLE … SET SCHEMA <owner>`.

Ownership matrix:

| Owner | Tables |
|---|---|
| auth-service | `users`, `otp_tokens`, `refresh_tokens`, `user_sessions` |
| users-service | `parent_children` |
| schools-service | `schools`, `classes`, `class_students` |
| billing-service | `payments`, `invoices`, `coupons`, `coupon_usages` |
| learning-service | `subjects`, `ai_sessions`, `past_papers`, `exam_attempts`, `progress_logs`, `subject_scores`, `achievements`, `user_achievements`, `leaderboard_entries` |
| admin-service | `settings` |
| notifications-service | `notifications` |

Cross-service reads (e.g. billing reads `users.email`) are allowed but writes stay with the owner.

## Cross-service communication

- **Sync reads**: `httpx.AsyncClient` (see [libs/elimu_common/elimu_common/http_client.py](libs/elimu_common/src/elimu_common/http_client.py))
- **Async events**: Redis Streams via [`events.py`](libs/elimu_common/src/elimu_common/events.py) for internal fire-and-forget
- **Payment queue**: BullMQ v5 wire format via [`bullmq.py`](libs/elimu_common/src/elimu_common/bullmq.py) — required so `mpesa-service` (Node) works unchanged
- **Auth**: JWT is verified **both** at the gateway (nginx `auth_request`) and defensively in each service (via `elimu_common.auth`)

## Running locally

```bash
cd backend-py
cp .env.example .env
docker compose up --build
```

Then hit `http://localhost:8080/api/auth/me` (goes through the gateway).

## Adding a new service

1. Copy `services/users-service/` as a template.
2. Change `PORT`, service name, and add routes.
3. Add its entry to `docker-compose.yml` and `gateway/nginx.conf`.

## Tests

Each service has its own `tests/` directory. From the service folder:

```bash
uv pip install -e .[dev]
pytest
```
