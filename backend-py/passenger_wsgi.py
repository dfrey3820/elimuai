"""Passenger/lsapi entry point for cPanel.

lswsgi imports this module once, then forks worker processes. a2wsgi's
ASGIMiddleware runs a dedicated event-loop thread, and threads do not survive
fork — so the middleware must be constructed lazily in each worker (keyed by
PID), never at import time.
"""
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
# Make elimu_common importable even without `pip install -e libs/elimu_common`.
sys.path.insert(1, str(BASE / "libs" / "elimu_common" / "src"))

# pydantic-settings resolves env_file=".env" against the CWD.
os.chdir(BASE)

from monolith.app import app as asgi_app  # noqa: E402

_wrapped = None
_wrapped_pid = None


def application(environ, start_response):
    global _wrapped, _wrapped_pid
    pid = os.getpid()
    if _wrapped is None or _wrapped_pid != pid:
        from a2wsgi import ASGIMiddleware
        _wrapped = ASGIMiddleware(asgi_app)
        _wrapped_pid = pid
    return _wrapped(environ, start_response)
