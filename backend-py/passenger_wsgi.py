"""Passenger entry point for cPanel.

cPanel's "Setup Python App" looks for passenger_wsgi.py in the application
root. Deploy the whole backend-py/ tree as the application root, then copy
this file there (the GitHub Actions workflow does both).
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

from a2wsgi import ASGIMiddleware  # noqa: E402

from monolith.app import app as asgi_app  # noqa: E402

application = ASGIMiddleware(asgi_app)
