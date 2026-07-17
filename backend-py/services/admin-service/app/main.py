"""admin-service — dashboard, users, transactions, settings, CH6 network."""
from __future__ import annotations

from elimu_common.app_factory import create_app

from .deps import settings
from .routers.admin import router
from .routers.ch6_insurance_network import router as ch6_router

app = create_app(settings, routers=[router, ch6_router])
