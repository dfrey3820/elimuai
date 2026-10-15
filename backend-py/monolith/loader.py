"""Import each service's `app` package under a unique alias.

Every service ships a package literally named ``app`` — fine when each runs in
its own container, impossible to import twice in one process. This loader maps
``services/<name>-service/app`` into ``sys.modules["<name>_app"]`` so all seven
coexist. Intra-service imports are all relative, so they resolve against the
alias automatically.
"""
from __future__ import annotations

import importlib
import importlib.util
import sys
from pathlib import Path
from types import ModuleType

SERVICES_DIR = Path(__file__).resolve().parent.parent / "services"


def load_service(name: str) -> ModuleType:
    """Load services/<name>-service/app as the package `<name>_app`."""
    alias = f"{name}_app"
    if alias in sys.modules:
        return sys.modules[alias]
    pkg_dir = SERVICES_DIR / f"{name}-service" / "app"
    spec = importlib.util.spec_from_file_location(
        alias,
        pkg_dir / "__init__.py",
        submodule_search_locations=[str(pkg_dir)],
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load service package: {pkg_dir}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[alias] = module
    spec.loader.exec_module(module)
    return module


def import_submodule(service: str, dotted: str) -> ModuleType:
    """Import e.g. import_submodule('auth', 'routers.auth') -> auth_app.routers.auth."""
    load_service(service)
    return importlib.import_module(f"{service}_app.{dotted}")
