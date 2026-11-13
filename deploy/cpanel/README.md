# ElimuAI on cPanel (branch `cpanel-mysql`)

Shared-hosting deployment: one FastAPI monolith (Passenger) + MySQL + static
Next.js frontend. The AWS/Postgres microservice stack lives on `main`; this
branch carries the cPanel adaptations. Deploys run from GitHub Actions
([deploy-cpanel.yml](../../.github/workflows/deploy-cpanel.yml)) on every push
to `cpanel-mysql`.

## Architecture

```
elimuai.africa        → public_html (Next.js static export + .htaccess)
api.elimuai.africa    → cPanel Python App (Passenger) → backend-py monolith
MySQL (cPanel)        → all tables, schema in backend-py/monolith/schema.mysql.sql
cron                  → daily billing reminders + payment reconciliation
```

Key differences vs AWS: no Redis (in-process event bus), no nginx gateway
(JWT verified per-route; `TRUST_GATEWAY_HEADERS=false` is mandatory), no
background loops (cron hits admin endpoints instead). AI Photo-Scan streaming
degrades to buffered responses under Passenger WSGI.

## One-time cPanel setup

1. **Subdomain** — create `api.elimuai.africa` (Domains → Create a New Domain,
   no separate document root needed; the Python app will claim it).

2. **MySQL** (MySQL® Databases):
   - Create database `<user>_elimuai`, user `<user>_elimu`, grant ALL.
   - Import the schema (Terminal):
     `mysql -u <user>_elimu -p <user>_elimuai < ~/elimuai-api/monolith/schema.mysql.sql`
     (phpMyAdmin import also works, but the agent-commission triggers need the
     CLI because of `DELIMITER`.)

3. **Python App** (Setup Python App):
   - Python version: **3.11+** (3.12 preferred).
   - Application root: `elimuai-api`
   - Application URL: `api.elimuai.africa` / (root)
   - Application startup file: `passenger_wsgi.py` (default)
   - Note the venv path it prints, e.g.
     `/home/<user>/virtualenv/elimuai-api/3.11` — you need its `bin/pip` for
     the `CPANEL_PIP` secret.

4. **Environment** — create `~/elimuai-api/.env` from
   [backend-py/monolith/.env.example](../../backend-py/monolith/.env.example):
   set `DATABASE_URL` (format
   `mysql+aiomysql://<user>_elimu:<pass>@localhost/<user>_elimuai`),
   a fresh 64-char `JWT_SECRET`, provider keys. Keep
   `TRUST_GATEWAY_HEADERS=false`.

5. **SSH key** (SSH Access → Manage SSH Keys): generate/import a key pair,
   **authorize** the public key, put the private key in the `CPANEL_SSH_KEY`
   GitHub secret.

6. **SSL** — Let's Encrypt via cPanel (SSL/TLS Status → Run AutoSSL) for both
   `elimuai.africa` and `api.elimuai.africa`.

7. **Cron jobs** (Cron Jobs) — replaces the AWS in-process loops. Create an
   admin JWT (login as a super_admin, copy the access token — or mint a
   long-lived one) and store it in `~/.elimu_cron_token` (chmod 600):

   ```
   # daily 06:00 — subscription reminder sweep
   0 6 * * * curl -s -X POST -H "Authorization: Bearer $(cat ~/.elimu_cron_token)" https://api.elimuai.africa/api/payments/reminders/run
   # every 15 min — reconcile stuck payments with the gateway
   */15 * * * * curl -s -X POST -H "Authorization: Bearer $(cat ~/.elimu_cron_token)" https://api.elimuai.africa/api/payments/admin/reconcile
   # daily 03:00 — DB backup, keep 7
   0 3 * * * mysqldump -u <user>_elimu -p'PASS' <user>_elimuai | gzip > ~/backups/elimuai_$(date +\%u).sql.gz
   ```

## GitHub configuration

Secrets (repo → Settings → Secrets → Actions):

| Secret | Example |
|---|---|
| `CPANEL_HOST` | `server123.yourhost.com` |
| `CPANEL_PORT` | `22` (Namecheap: `21098`) |
| `CPANEL_USER` | cPanel username |
| `CPANEL_SSH_KEY` | private key authorized in step 5 |
| `CPANEL_PIP` | `/home/<user>/virtualenv/elimuai-api/3.11/bin/pip` |

Optional variables: `API_BASE_URL` (default `https://api.elimuai.africa`),
`CPANEL_API_DIR` (default `~/elimuai-api`), `CPANEL_WWW_DIR`
(default `~/public_html`).

## Deploy

Push to `cpanel-mysql`. The workflow: monolith smoke test → frontend static
build (with `NEXT_PUBLIC_API_BASE_URL` baked in) → rsync backend + frontend →
pip install → `touch tmp/restart.txt` → `/health` smoke check.

## Local testing of the monolith

```bash
cd backend-py
pip install -r monolith/requirements.txt
export DATABASE_URL='mysql+aiomysql://root@127.0.0.1:3307/elimuai'  # see note
export JWT_SECRET=dev-0123456789abcdef0123456789abcdef
uvicorn monolith.app:app --port 8000
```

## Switching back to AWS

`main` is untouched. Merge `cpanel-mysql` → feature work carefully: the
models/raw-SQL changes are MySQL-flavoured. The intended flow is to
cherry-pick business-logic commits between branches and keep the dialect
differences (`models.py`, raw SQL, `monolith/`, this directory) branch-local.
`TRUST_GATEWAY_HEADERS=true` must be set in the AWS task env if `auth.py`
changes are ever merged back (the nginx gateway relies on header injection).
