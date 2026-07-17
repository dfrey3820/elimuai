"""users-service — profile, children (parent), summary."""
from __future__ import annotations

from elimu_common.app_factory import create_app

from .deps import settings
from .routers.users import children_router, router

app = create_app(settings, routers=[router, children_router])
