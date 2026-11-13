#!/usr/bin/env bash
# Apply idempotent MySQL migrations (scripts/*.mysql.sql) to the app database.
# Reads DATABASE_URL from the app's .env (same file pydantic loads at runtime).
# Safe to re-run: every *.mysql.sql migration is guarded / uses IF [NOT] EXISTS.
# The mysql CLI is required because trigger definitions use DELIMITER.
set -euo pipefail

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found next to the app; skipping migrations." >&2
  exit 0
fi

DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
DB_URL="${DB_URL%\"}"; DB_URL="${DB_URL#\"}"
DB_URL="${DB_URL%\'}"; DB_URL="${DB_URL#\'}"
if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL not set in $ENV_FILE" >&2
  exit 1
fi

CNF="$(mktemp)"
trap 'rm -f "$CNF"' EXIT

# Turn the SQLAlchemy URL into a mysql CLI options file (keeps the password
# off the command line / process list).
DB_URL="$DB_URL" python3 - "$CNF" <<'PY'
import os, sys, urllib.parse as u
p = u.urlparse(os.environ["DB_URL"])
with open(sys.argv[1], "w") as f:
    f.write("[client]\n")
    f.write("host=%s\n" % (p.hostname or "localhost"))
    f.write("port=%s\n" % (p.port or 3306))
    f.write("user=%s\n" % u.unquote(p.username or ""))
    f.write("password=%s\n" % u.unquote(p.password or ""))
    f.write("database=%s\n" % (p.path or "").lstrip("/"))
PY
chmod 600 "$CNF"

shopt -s nullglob
applied=0
for f in scripts/*.mysql.sql; do
  echo "Applying migration: $f"
  mysql --defaults-extra-file="$CNF" < "$f"
  applied=$((applied + 1))
done
echo "Done. Applied $applied migration file(s)."
