"""Cron entry point: python cron_task.py reminders|reconcile

Replaces the in-process loops used on AWS. Runs the same sweeps directly
against the DB, so no admin JWT has to be stored on the server.
"""
import asyncio
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
sys.path.insert(1, str(BASE / "libs" / "elimu_common" / "src"))
os.chdir(BASE)

TASKS = ("reminders", "reconcile")


async def main(task: str) -> None:
    from monolith.app import app, db
    from monolith.loader import import_submodule

    try:
        if task == "reminders":
            result = await import_submodule("billing", "scheduler").run_once(app)
        else:
            result = await import_submodule("billing", "reconciler").run_once(app)
        print(f"{task}: {result}")
    finally:
        await db.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in TASKS:
        sys.exit(f"usage: cron_task.py {'|'.join(TASKS)}")
    try:
        asyncio.run(main(sys.argv[1]))
        code = 0
    except Exception as exc:  # noqa: BLE001
        print(f"{sys.argv[1]}: FAILED {exc!r}")
        code = 1
    sys.stdout.flush()
    # Skip interpreter teardown: aiomysql sockets finalise after the loop closes and spam tracebacks.
    os._exit(code)
