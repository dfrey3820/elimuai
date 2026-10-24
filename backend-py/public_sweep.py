"""Authenticated sweep THROUGH THE PUBLIC URL (LiteSpeed -> Passenger -> MariaDB), one token per role.
Run on the server. Tokens are minted from the server's own secret and expire in 5 minutes."""
import json, os, re, sys, time, urllib.request, urllib.error, uuid
import pymysql
from jose import jwt

BASE = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE)
env = dict(l.rstrip("\n").split("=", 1) for l in open(".env") if "=" in l and not l.startswith("#"))
u, p, h, d = re.match(r"mysql\+aiomysql://([^:]+):([^@]+)@([^/]+)/(.+)", env["DATABASE_URL"]).groups()
db = pymysql.connect(host=h, user=u, password=p, database=d, autocommit=True)
cur = db.cursor()
TAG = "pubsweep" + uuid.uuid4().hex[:6]
API = "https://api.elimuai.africa"
spec = json.load(urllib.request.urlopen(API + "/openapi.json", timeout=30)) if False else None

# paths from the live app's own schema, loaded in-process (no network needed for the list)
sys.path.insert(0, BASE); sys.path.insert(1, os.path.join(BASE, "libs", "elimu_common", "src"))
for k in ("RESEND_API_KEY", "SMTP_HOST", "ANTHROPIC_API_KEY", "PAYMENT_GATEWAY_URL"):
    os.environ[k] = ""
from monolith.app import app  # noqa: E402
paths = sorted(p_ for p_, ops in app.openapi()["paths"].items() if "get" in ops and "{" not in p_ and p_ != "/health")

users = {}
for role in ("student", "teacher", "parent", "admin", "super_admin"):
    uid = str(uuid.uuid4())
    cur.execute("INSERT INTO users (id,name,email,password_hash,role,plan,is_active,email_verified,onboarded,grade_level,country) "
                "VALUES (%s,%s,%s,'x',%s,'free',1,1,1,'Grade 7','KE')", (uid, f"sweep {role}", f"{TAG}.{role}@sit.elimuai.africa", role))
    users[role] = uid


def call(path, role):
    tok = jwt.encode({"userId": users[role], "role": role, "exp": int(time.time()) + 300}, env["JWT_SECRET"], algorithm="HS256")
    req = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + tok, "User-Agent": "elimu-sweep"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


try:
    table = {}
    server_errors = []
    for path in paths:
        row = {}
        for role in users:
            c = call(path, role)
            row[role] = c
            if c >= 500 or c == 0:
                server_errors.append((path, role, c))
        table[path] = row
    print(f"swept {len(paths)} GET endpoints x 5 roles = {len(paths) * 5} requests through https://api.elimuai.africa")
    codes = {}
    for row in table.values():
        for c in row.values():
            codes[c] = codes.get(c, 0) + 1
    print("status counts:", dict(sorted(codes.items())))
    print("SERVER ERRORS (5xx / connection):", len(server_errors))
    for e in server_errors:
        print("  ", e)
    print("--- per-endpoint access map (S=student T=teacher P=parent A=admin X=super_admin; . = denied/other)")
    for path, row in table.items():
        flags = "".join((k[0].upper() if k != "super_admin" else "X") if v == 200 else "." for k, v in row.items())
        print(f"  {flags}  {path}")
finally:
    for uid in users.values():
        cur.execute("DELETE FROM users WHERE id=%s", (uid,))
    cur.execute("SELECT COUNT(*) FROM users WHERE email LIKE %s", (f"{TAG}.%",))
    print("cleanup leftover:", cur.fetchone()[0], flush=True)
    os._exit(0)
