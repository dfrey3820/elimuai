"""The combined FastAPI app for shared-hosting deployments.

One process serves every route the nginx gateway + 6 services served on AWS:
  /api/auth, /api/users, /api/children, /api/schools, /api/onboarding,
  /api/payments, /api/coupons, /api/agents, /api/ai, /api/progress,
  /api/leaderboard, /api/exams, /api/curriculum, /api/admin

Differences from the microservice deployment:
  * No Redis — LocalEventBus dispatches notification events in-process.
  * No nginx gateway — JWT is verified by each router's own dependency
    (TRUST_GATEWAY_HEADERS must stay false), CORS handled here.
  * Background loops (reminders/reconciler) are NOT started; trigger them
    via cron:  POST /api/payments/reminders/run  and  /api/payments/admin/reconcile.
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from elimu_common.db import DB
from elimu_common.errors import register_exception_handlers
from elimu_common.local_events import LocalEventBus
from elimu_common.logger import configure_logging

from .loader import import_submodule

# ─── Load every service under its alias ─────────────────────────────────────
auth_routes = import_submodule("auth", "routers.auth")
users_routes = import_submodule("users", "routers.users")
schools_routes = import_submodule("schools", "routers.schools")
onboarding_routes = import_submodule("schools", "routers.onboarding")
billing_routes = import_submodule("billing", "routers.billing")
renew_routes = import_submodule("billing", "routers.renew")
webhook_routes = import_submodule("billing", "routers.webhook")
agents_routes = import_submodule("billing", "routers.agents")
ai_routes = import_submodule("learning", "routers.ai")
photoscan_routes = import_submodule("learning", "routers.photoscan")
curriculum_routes = import_submodule("learning", "routers.curriculum")
exams_routes = import_submodule("learning", "routers.exams")
progress_routes = import_submodule("learning", "routers.progress")
leaderboard_routes = import_submodule("learning", "routers.leaderboard")
admin_routes = import_submodule("admin", "routers.admin")
notif_worker = import_submodule("notifications", "worker")

billing_settings = import_submodule("billing", "deps").settings
learning_settings = import_submodule("learning", "deps").settings
notif_settings = notif_worker.Settings()  # type: ignore[call-arg]

logger = configure_logging("elimuai-monolith", billing_settings.log_level)
db = DB(billing_settings.database_url)

# a2wsgi never runs ASGI lifespan, so all app.state wiring happens at import
# time. Nothing here needs a running event loop.
_bus = LocalEventBus()


async def _notify(topic: str, payload: dict) -> None:
    await notif_worker.handle(notif_settings, topic, payload)


_bus.register(_notify)

app = FastAPI(title="elimuai-api", version="0.1.0")

app.state.db = db
app.state.logger = logger
app.state.settings = billing_settings  # scheduler/reconciler read billing knobs
app.state.event_bus = _bus
app.state.bullmq = None  # BullMQ path disabled — payments go via HTTP gateway

if learning_settings.anthropic_api_key:
    try:
        from anthropic import Anthropic
        app.state.anthropic = Anthropic(api_key=learning_settings.anthropic_api_key)
    except Exception:  # noqa: BLE001
        app.state.anthropic = None
else:
    app.state.anthropic = None

register_exception_handlers(app, is_prod=(billing_settings.env == "production"))

_cors = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors or [
        "https://elimuai.africa",
        "https://www.elimuai.africa",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "elimuai-monolith"} | await db.healthcheck()


for router in (
    auth_routes.router,            # /api/auth  (internal verify router deliberately NOT mounted)
    users_routes.router,
    users_routes.children_router,
    schools_routes.router,
    onboarding_routes.router,
    billing_routes.router,
    billing_routes.coupons_router,
    renew_routes.router,
    webhook_routes.router,
    agents_routes.router,
    ai_routes.router,
    photoscan_routes.router,
    curriculum_routes.router,
    exams_routes.router,
    progress_routes.router,
    leaderboard_routes.router,
    admin_routes.router,
):
    app.include_router(router)
