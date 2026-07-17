# Shared Dockerfile — used by every Python service via build ARGs.
#
# Build context must be `backend-py/` (root) so we can COPY the shared
# elimu_common library and the service's own source.
#
# Example (from docker-compose.yml):
#   build:
#     context: .
#     dockerfile: services/Dockerfile
#     args: { SERVICE: auth-service }
FROM python:3.12-slim AS base

ARG SERVICE
ENV SERVICE_DIR=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${SERVICE_DIR}

# ─── Install shared lib first (rarely changes) ──────────────────────────────
COPY libs/elimu_common /opt/libs/elimu_common
RUN pip install --upgrade pip && pip install /opt/libs/elimu_common

# ─── Install the specific service ───────────────────────────────────────────
COPY services/${SERVICE}/pyproject.toml ./pyproject.toml
RUN pip install .

COPY services/${SERVICE}/app ./app
COPY services/${SERVICE}/tests ./tests

# Notifications-service is a worker, not an HTTP server, so its Dockerfile CMD
# is overridden in docker-compose. Default for HTTP services:
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
