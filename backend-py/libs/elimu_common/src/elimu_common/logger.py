"""Structured logging setup shared across services."""
from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(service_name: str, level: str = "INFO") -> structlog.stdlib.BoundLogger:
    """Configure structlog to emit JSON logs to stdout. Idempotent."""
    lvl = getattr(logging, level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=lvl,
        force=True,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(lvl),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger(service_name).bind(service=service_name)
