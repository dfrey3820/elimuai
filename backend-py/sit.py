"""System integration test for the ElimuAI cPanel deployment.

Runs in-process against the real database with every outbound provider
(email, SMS, payment gateway, Anthropic) disabled, and deletes every row it
created. Run on the server:  python sit.py
"""
import contextlib
import hashlib
import hmac
import json
import os
import re
import sys
import time
import uuid

# Disable outbound side effects BEFORE settings are read (env beats .env).
for _k in ("RESEND_API_KEY", "BREVO_API_KEY", "MAILTRAP_API_TOKEN", "SMTP_HOST",
           "AT_API_KEY", "ANTHROPIC_API_KEY", "PAYMENT_GATEWAY_URL"):
    os.environ[_k] = ""

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
sys.path.insert(1, os.path.join(BASE, "libs", "elimu_common", "src"))
os.chdir(BASE)

import bcrypt  # noqa: E402
import pymysql  # noqa: E402
from jose import jwt  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402

env = dict(l.rstrip("\n").split("=", 1) for l in open(".env") if "=" in l and not l.startswith("#"))
_u, _p, _h, _d = re.match(r"mysql\+aiomysql://([^:]+):([^@]+)@([^/]+)/(.+)", env["DATABASE_URL"]).groups()
JWT_SECRET = env["JWT_SECRET"]
GW_SECRET = env.get("PAYMENT_GATEWAY_API_SECRET", "")

from monolith.app import app  # noqa: E402

TAG = "sit" + uuid.uuid4().hex[:8]
DOM = "sit.elimuai.africa"
db = pymysql.connect(host=_h, user=_u, password=_p, database=_d, autocommit=True)
results = []


def q(sql, args=()):
    cur = db.cursor(pymysql.cursors.DictCursor)
    cur.execute(sql, args)
    return cur


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""), flush=True)


@contextlib.contextmanager
def section(title):
    print(f"-- {title}", flush=True)
    try:
        yield
    except Exception as exc:  # noqa: BLE001
        check(f"section crashed: {title}", False, repr(exc)[:220])


def H(uid, role):
    t = jwt.encode({"userId": str(uid), "role": role, "exp": int(time.time()) + 900}, JWT_SECRET, algorithm="HS256")
    return {"Authorization": "Bearer " + t}


def mkuser(role, plan="free"):
    uid = str(uuid.uuid4())
    email = f"{TAG}.{role}.{uuid.uuid4().hex[:4]}@{DOM}"
    pw = bcrypt.hashpw(b"Sit-Pass-123", bcrypt.gensalt(rounds=4)).decode()
    q("INSERT INTO users (id,name,email,password_hash,role,plan,is_active,email_verified,onboarded,grade_level,country) "
      "VALUES (%s,%s,%s,%s,%s,%s,1,1,1,%s,'KE')", (uid, f"SIT {role}", email, pw, role, plan, "Grade 7"))
    return uid, email


def find_key(d, names):
    if isinstance(d, dict):
        for k, v in d.items():
            if k in names and isinstance(v, str):
                return v
            f = find_key(v, names)
            if f:
                return f


def cleanup():
    uids = [r["id"] for r in q("SELECT id FROM users WHERE email LIKE %s", (f"{TAG}.%",)).fetchall()]
    if uids:
        ph = ",".join(["%s"] * len(uids))
        for t, col in (("progress_logs", "user_id"), ("subject_scores", "user_id"), ("user_achievements", "user_id"),
                       ("leaderboard_entries", "user_id"), ("ai_sessions", "user_id"), ("exam_attempts", "user_id"),
                       ("payments", "user_id"), ("invoices", "user_id"), ("coupon_usages", "user_id"),
                       ("subscription_reminders", "user_id"), ("otp_tokens", "user_id"), ("refresh_tokens", "user_id"),
                       ("user_sessions", "user_id"), ("parent_children", "parent_id"), ("parent_children", "child_id"),
                       ("class_students", "student_id"), ("classes", "teacher_id"), ("notifications", "user_id"),
                       ("agent_referrals", "user_id"), ("marketing_agents", "user_id")):
            with contextlib.suppress(Exception):
                q(f"DELETE FROM {t} WHERE {col} IN ({ph})", uids)
        q(f"DELETE FROM users WHERE id IN ({ph})", uids)
    with contextlib.suppress(Exception):
        q("DELETE FROM otp_tokens WHERE email LIKE %s", (f"{TAG}.%",))
    with contextlib.suppress(Exception):
        q("DELETE FROM schools WHERE name LIKE %s", (f"{TAG}%",))
    with contextlib.suppress(Exception):
        q("DELETE FROM coupons WHERE code LIKE %s", (f"{TAG.upper()}%",))
    with contextlib.suppress(Exception):
        q("DELETE FROM payments WHERE reference LIKE %s", (f"{TAG}%",))
    with contextlib.suppress(Exception):
        q("DELETE FROM partners WHERE full_name LIKE %s", (f"{TAG}%",))


def main():
    c = TestClient(app, raise_server_exceptions=False)
    with c:
        stu, _ = mkuser("student"); tea, _ = mkuser("teacher"); par, _ = mkuser("parent")
        adm, _ = mkuser("admin"); sup, _ = mkuser("super_admin")
        roles = {"student": stu, "teacher": tea, "parent": par, "admin": adm, "super_admin": sup}
        S, P, A2, SU = H(stu, "student"), H(par, "parent"), H(adm, "admin"), H(sup, "super_admin")

        with section("health + public"):
            r = c.get("/health")
            check("health (db ok)", r.status_code == 200 and r.json().get("database") == "ok", r.text[:80])
            check("public: subscription-info", c.get("/api/payments/subscription-info").status_code == 200)
            check("public: offline-lessons", c.get("/api/curriculum/offline-lessons").status_code == 200)

        with section("auth flow (email disabled; OTP read from DB)"):
            email = f"{TAG}.reg@{DOM}"
            r = c.post("/api/auth/register", json={"name": "SIT Reg", "email": email, "password": "Sit-Pass-123",
                                                   "role": "student", "gradeLevel": "Grade 7"})
            check("auth: register 201", r.status_code == 201, r.text[:140])
            r = c.post("/api/auth/login", json={"identifier": email, "password": "Sit-Pass-123"})
            check("auth: login before verification rejected (401)", r.status_code == 401, str(r.status_code))
            code = q("SELECT code FROM otp_tokens WHERE email=%s ORDER BY created_at DESC LIMIT 1", (email,)).fetchone()
            check("auth: OTP stored", bool(code))
            r = c.post("/api/auth/verify-otp", json={"email": email, "code": (code or {}).get("code", ""), "purpose": "signup"})
            check("auth: verify signup OTP 200", r.status_code == 200, r.text[:140])
            r = c.post("/api/auth/verify-otp", json={"email": email, "code": "000000", "purpose": "login"})
            check("auth: wrong OTP rejected (4xx)", 400 <= r.status_code < 500, str(r.status_code))
            r = c.post("/api/auth/login", json={"identifier": email, "password": "wrong-pass"})
            check("auth: wrong password rejected (401)", r.status_code == 401, str(r.status_code))
            r = c.post("/api/auth/login", json={"identifier": email, "password": "Sit-Pass-123"})
            check("auth: login -> requiresOTP", r.status_code == 200 and r.json().get("requiresOTP") is True, r.text[:120])
            code = q("SELECT code FROM otp_tokens WHERE email=%s ORDER BY created_at DESC LIMIT 1", (email,)).fetchone()
            r = c.post("/api/auth/verify-otp", json={"email": email, "code": (code or {}).get("code", ""), "purpose": "login"})
            body = r.json() if r.status_code == 200 else {}
            access = find_key(body, ("accessToken", "access_token"))
            refresh = find_key(body, ("refreshToken", "refresh_token"))
            check("auth: login OTP -> access token", bool(access), r.text[:140])
            Au = {"Authorization": "Bearer " + access} if access else {}
            check("auth: /me", c.get("/api/auth/me", headers=Au).status_code == 200)
            if refresh:
                r = c.post("/api/auth/refresh", json={"refreshToken": refresh})
                check("auth: refresh token", r.status_code == 200, r.text[:120])
            check("auth: sessions list", c.get("/api/auth/sessions", headers=Au).status_code == 200)
            check("auth: no token -> 401", c.get("/api/auth/me").status_code == 401)
            check("auth: garbage token -> 401", c.get("/api/auth/me", headers={"Authorization": "Bearer a.b.c"}).status_code == 401)
            check("auth: spoofed X-User headers ignored (401)", c.get("/api/admin/dashboard", headers={"X-User-Id": "x", "X-User-Role": "super_admin"}).status_code == 401)

        with section("role matrix (RBAC)"):
            admin_only = {"admin", "super_admin"}
            for path in ("/api/admin/dashboard", "/api/admin/users", "/api/admin/transactions", "/api/admin/settings",
                         "/api/admin/ch6/networks", "/api/agents/", "/api/coupons/admin"):
                bad = []
                for role, uid in roles.items():
                    code_ = c.get(path, headers=H(uid, role)).status_code
                    if role in admin_only and code_ >= 400:
                        bad.append(f"{role}={code_}")
                    if role not in admin_only and code_ not in (401, 403):
                        bad.append(f"{role}={code_}")
                check(f"rbac: {path}", not bad, ",".join(bad))

        with section("learner journey (student)"):
            check("learn: subjects", c.get("/api/curriculum/subjects", headers=S).status_code == 200)
            check("learn: progress summary", c.get("/api/progress/summary", headers=S).status_code == 200)
            check("learn: achievements", c.get("/api/progress/achievements", headers=S).status_code == 200)
            r = c.post("/api/progress/log", headers=S, json={"activityType": "ai_tutor", "durationMins": 5})
            check("learn: log activity awards XP", r.status_code == 200 and r.json().get("xpEarned", 0) > 0, r.text[:120])
            r = c.post("/api/progress/log", headers=S, json={"activityType": "ai_tutor", "durationMins": 3})
            check("learn: second log (upsert path)", r.status_code == 200, r.text[:120])
            xp = q("SELECT COALESCE(SUM(xp),0) s FROM leaderboard_entries WHERE user_id=%s", (stu,)).fetchone()["s"]
            check("learn: leaderboard rows persisted", xp > 0, str(xp))
            check("learn: leaderboard", c.get("/api/leaderboard?period=weekly", headers=S).status_code == 200)
            check("learn: my-ranks", c.get("/api/leaderboard/my-ranks", headers=S).status_code == 200)
            check("learn: exam papers gated for free plan (402)", c.get("/api/exams/papers", headers=S).status_code == 402)
            q("UPDATE users SET plan='student', plan_expires=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id=%s", (stu,))
            check("learn: exam papers open for paid plan (200)", c.get("/api/exams/papers", headers=S).status_code == 200)
            q("UPDATE users SET plan='free', plan_expires=NULL WHERE id=%s", (stu,))
            check("learn: exam history", c.get("/api/exams/history", headers=S).status_code == 200)
            # JSON write paths (MariaDB stores JSON as text; CAST AS JSON broke these once)
            r = c.post("/api/exams/attempts", headers=S, json={"pastPaperId": None, "questions": [{"q": "1+1"}], "answers": ["2"], "score": 1, "total": 1, "timeTakenSecs": 10})
            check("learn: exam attempt save (JSON columns, no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:140]}")
            r = c.post("/api/ai/tutor", headers=S, json={"messages": [{"role": "user", "content": "hi"}], "subject": "Mathematics"})
            check("learn: AI tutor w/o key -> clean 503", r.status_code == 503, f"{r.status_code} {r.text[:100]}")

            class _Blk:
                text = "SIT stub reply"

            class _Resp:
                content = [_Blk()]

            class _Msgs:
                @staticmethod
                def create(**kw):
                    return _Resp()

            class _FakeAnthropic:
                messages = _Msgs()

            app.state.anthropic = _FakeAnthropic()
            try:
                r = c.post("/api/ai/tutor", headers=S, json={"messages": [{"role": "user", "content": "hi"}], "subject": "Mathematics"})
                check("learn: AI tutor reply + session saved (JSON insert)", r.status_code == 200, f"{r.status_code} {r.text[:160]}")
                sid = q("SELECT id FROM ai_sessions WHERE user_id=%s ORDER BY created_at DESC LIMIT 1", (stu,)).fetchone()
                check("learn: ai_sessions row stored", bool(sid))
                if sid:
                    r = c.post("/api/ai/tutor", headers=S, json={"messages": [{"role": "user", "content": "more"}], "subject": "Mathematics", "sessionId": str(sid["id"])})
                    check("learn: AI tutor follow-up appends (JSON_MERGE_PRESERVE)", r.status_code == 200, f"{r.status_code} {r.text[:160]}")
                    n = q("SELECT JSON_LENGTH(messages) n FROM ai_sessions WHERE id=%s", (str(sid['id']),)).fetchone()["n"]
                    check("learn: session message count grew to 4", n == 4, str(n))
            finally:
                app.state.anthropic = None
            check("learn: users/profile", c.get("/api/users/profile", headers=S).status_code == 200)

        with section("parent -> child"):
            r = c.post("/api/users/onboard-child", headers=P, json={"name": "SIT Child", "gradeLevel": "Grade 3",
                                                                      "email": f"{TAG}.child@{DOM}"})
            check("parent: onboard child", r.status_code in (200, 201), f"{r.status_code} {r.text[:140]}")
            r = c.get("/api/users/children", headers=P)
            check("parent: list children includes the new child", r.status_code == 200 and "SIT Child" in r.text, f"{r.status_code} {r.text[:120]}")

        with section("schools + onboarding"):
            sch = str(uuid.uuid4())
            q("INSERT INTO schools (id, name, country) VALUES (%s, %s, 'KE')", (sch, f"{TAG} School"))
            q("UPDATE users SET school_id=%s WHERE id=%s", (sch, adm))
            check("schools: get school", c.get(f"/api/schools/{sch}", headers=A2).status_code == 200)
            check("schools: stats", c.get(f"/api/schools/{sch}/stats", headers=A2).status_code == 200)
            check("schools: students", c.get(f"/api/schools/{sch}/students", headers=A2).status_code == 200)
            check("leaderboard: school rankings for a school admin (joins on MariaDB)", c.get("/api/leaderboard/school-rankings?period=weekly", headers=A2).status_code == 200)
            check("leaderboard: school scope filter", c.get(f"/api/leaderboard?period=weekly&scope=school&scopeId={sch}", headers=A2).status_code == 200)
            check("onboarding: teachers list", c.get("/api/onboarding/teachers", headers=A2).status_code == 200)
            check("onboarding: students list", c.get("/api/onboarding/students", headers=A2).status_code == 200)
            r = c.post("/api/onboarding/teachers", headers=A2, json={"teachers": [{"name": "SIT Teacher", "email": f"{TAG}.t1@{DOM}"}]})
            check("onboarding: add teacher (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:140]}")
            check("onboarding: teachers list after add (LATERAL port)", c.get("/api/onboarding/teachers", headers=A2).status_code == 200)

        with section("billing, coupons, webhook"):
            code_c = f"{TAG.upper()}10"
            r = c.post("/api/coupons/admin", headers=SU, json={"code": code_c, "type": "percentage", "value": 10,
                                                               "applicable_plans": ["student"], "max_uses": 5})
            check("coupon: create", r.status_code == 201, r.text[:160])
            cid = (r.json().get("coupon") or {}).get("id") if r.status_code == 201 else None
            check("coupon: list", c.get("/api/coupons/admin", headers=SU).status_code == 200)
            if cid:
                r = c.put(f"/api/coupons/admin/{cid}", headers=SU, json={"description": "SIT", "max_discount": 100})
                check("coupon: update", r.status_code == 200, r.text[:120])
            r = c.post("/api/coupons/validate", headers=S, json={"code": code_c, "plan": "student", "billing_cycle": "monthly", "amount": 1000})
            check("coupon: validate (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:120]}")
            r = c.post("/api/coupons/validate", headers=S, json={"code": "NOPE", "plan": "student", "billing_cycle": "monthly", "amount": 1000})
            check("coupon: unknown code -> valid:false", r.status_code == 200 and r.json().get("valid") is False, f"{r.status_code} {r.text[:100]}")
            check("billing: history", c.get("/api/payments/history", headers=S).status_code == 200)
            r = c.post("/api/payments/mpesa/initiate", headers=S, json={"plan": "student", "billing_cycle": "monthly", "phone": "254700000000"})
            check("billing: initiate w/ no gateway -> clean 503, not a crash", r.status_code == 503, f"{r.status_code} {r.text[:120]}")
            if cid:
                check("coupon: delete", c.delete(f"/api/coupons/admin/{cid}", headers=SU).status_code == 200)
            if GW_SECRET:
                ref = f"{TAG}-PAY"
                pid = str(uuid.uuid4())
                q("INSERT INTO payments (id,user_id,plan,billing_cycle,amount,currency,method,status,reference) "
                  "VALUES (%s,%s,'student','monthly',500,'KES','mpesa','pending',%s)", (pid, stu, ref))
                wb = json.dumps({"event": "transaction.completed", "data": {"reference": ref, "status": "completed", "amount": 500,
                                 "amount_paid": 500, "currency": "KES", "gateway_reference": "SITRCPT"}}).encode()
                sig = "sha256=" + hmac.new(GW_SECRET.encode(), wb, hashlib.sha256).hexdigest()
                hdr = {"X-Signature": sig, "Content-Type": "application/json"}
                r = c.post("/api/payments/webhook/gateway", content=wb, headers=hdr)
                check("webhook: signed completed -> 200", r.status_code == 200, f"{r.status_code} {r.text[:140]}")
                st = q("SELECT status FROM payments WHERE id=%s", (pid,)).fetchone()
                check("webhook: payment marked completed", bool(st) and st["status"] == "completed", str(st))
                pl = q("SELECT plan FROM users WHERE id=%s", (stu,)).fetchone()
                check("webhook: user plan upgraded", bool(pl) and pl["plan"] == "student", str(pl))
                r = c.post("/api/payments/webhook/gateway", content=wb, headers=hdr)
                check("webhook: replay is idempotent (no 5xx)", r.status_code < 500, str(r.status_code))
                r = c.post("/api/payments/webhook/gateway", content=wb, headers={"X-Signature": "sha256=bad", "Content-Type": "application/json"})
                check("webhook: bad signature -> 401", r.status_code == 401, str(r.status_code))

        with section("marketing agents (JSON payout_details + role enum)"):
            ag_user, ag_email = mkuser("student")
            r = c.post("/api/agents/", headers=SU, json={"email": ag_email, "commissionRate": 0.1, "payoutMethod": "mpesa",
                                                         "payoutDetails": {"phone": "254700000000"}, "notes": "SIT"})
            check("agents: create w/ JSON payout details", r.status_code in (200, 201), f"{r.status_code} {r.text[:160]}")
            aid = (r.json().get("agent") or {}).get("id") if r.status_code in (200, 201) else None
            role_now = q("SELECT role FROM users WHERE id=%s", (ag_user,)).fetchone()
            check("agents: user promoted to marketing_agent", bool(role_now) and role_now["role"] == "marketing_agent", str(role_now))
            if aid:
                r = c.patch(f"/api/agents/{aid}", headers=SU, json={"payoutDetails": {"phone": "254711111111"}, "isActive": True})
                check("agents: update payout details (JSON)", r.status_code == 200, f"{r.status_code} {r.text[:140]}")
                check("agents: get one", c.get(f"/api/agents/{aid}", headers=SU).status_code == 200)
                check("agents: list w/ search", c.get("/api/agents/?search=sit", headers=SU).status_code == 200)
                AG = H(ag_user, "marketing_agent")
                check("agents: me", c.get("/api/agents/me", headers=AG).status_code == 200)
                r = c.post("/api/agents/me/customers", headers=AG, json={"name": "SIT Customer", "email": f"{TAG}.cust@{DOM}", "role": "student"})
                check("agents: onboard customer", r.status_code in (200, 201), f"{r.status_code} {r.text[:140]}")
                check("agents: my referrals", c.get("/api/agents/me/referrals", headers=AG).status_code == 200)
                check("agents: my commissions", c.get("/api/agents/me/commissions", headers=AG).status_code == 200)
            check("agents: commissions/all", c.get("/api/agents/commissions/all", headers=SU).status_code == 200)

        with section("classes"):
            r = c.post("/api/onboarding/classes", headers=A2, json={"name": f"{TAG} Class", "gradeLevel": "Grade 7"})
            check("classes: create (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:140]}")
            check("classes: list", c.get("/api/onboarding/classes", headers=A2).status_code == 200)

        with section("admin console"):
            check("admin: dashboard numbers", (c.get("/api/admin/dashboard", headers=SU).json().get("users") or {}).get("total_users") is not None)
            r = c.post("/api/admin/users", headers=SU, json={"name": "SIT Created", "email": f"{TAG}.created@{DOM}", "password": "Sit-Pass-123", "role": "teacher"})
            check("admin: create user", r.status_code == 201, r.text[:120])
            newid = (r.json().get("user") or {}).get("id") if r.status_code == 201 else None
            if newid:
                check("admin: set subscription", c.put(f"/api/admin/users/{newid}/subscription", headers=SU, json={"plan": "teacher", "days": 30}).status_code == 200)
                check("admin: toggle active", c.put(f"/api/admin/users/{newid}/toggle-active", headers=SU).status_code == 200)
                check("admin: user detail", c.get(f"/api/admin/users/{newid}", headers=SU).status_code == 200)
                check("admin: cancel subscription", c.delete(f"/api/admin/users/{newid}/subscription", headers=SU).status_code == 200)
            prev = q("SELECT value FROM admin_settings WHERE `key`='trial_days'").fetchone()
            r = c.put("/api/admin/settings", headers=SU, json={"trial_days": "14"})
            check("admin: settings upsert (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:120]}")
            got = q("SELECT value FROM admin_settings WHERE `key`='trial_days'").fetchone()
            check("admin: settings value persisted", bool(got) and got["value"] == "14", str(got))
            if prev:  # put the production value back
                q("UPDATE admin_settings SET value=%s WHERE `key`='trial_days'", (prev["value"],))
            else:
                q("DELETE FROM admin_settings WHERE `key`='trial_days'")
            check("admin: settings read", c.get("/api/admin/settings", headers=SU).status_code == 200)

        with section("CH6 insurance network"):
            r = c.post("/api/admin/ch6/networks", headers=SU, json={"name": f"{TAG} Net", "head_name": f"{TAG} Head", "head_email": f"{TAG}.head@{DOM}"})
            check("ch6: create network (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:160]}")
            check("ch6: networks list", c.get("/api/admin/ch6/networks", headers=SU).status_code == 200)
            check("ch6: csv template", c.get("/api/admin/ch6/csv-template", headers=SU).status_code == 200)
            check("ch6: internal conversion route NOT public", c.post("/api/ch6/conversions/process", json={}).status_code in (404, 405))

        with section("cron entry points"):
            r = c.post("/api/payments/reminders/run", headers=SU)
            check("cron: reminders/run (no 5xx)", r.status_code < 500, f"{r.status_code} {r.text[:120]}")

        with section("input hardening"):
            r = c.post("/api/auth/login", json={"identifier": "' OR '1'='1", "password": "x"})
            check("sec: SQLi in login identifier -> 401/422", r.status_code in (401, 422), str(r.status_code))
            r = c.get("/api/admin/users?search=%27%20OR%201%3D1%20--", headers=SU)
            check("sec: SQLi in admin search -> no 5xx", r.status_code < 500, str(r.status_code))
            r = c.post("/api/auth/register", content=b"{not json", headers={"Content-Type": "application/json"})
            check("sec: malformed JSON -> 4xx", 400 <= r.status_code < 500, str(r.status_code))
            r = c.get("/api/admin/users/not-a-uuid", headers=SU)
            check("sec: bad uuid -> 4xx", 400 <= r.status_code < 500, str(r.status_code))


try:
    main()
finally:
    try:
        cleanup()
        left = q("SELECT COUNT(*) n FROM users WHERE email LIKE %s", (f"{TAG}.%",)).fetchone()["n"]
        print(f"cleanup: leftover test users = {left}", flush=True)
    except Exception as exc:  # noqa: BLE001
        print("cleanup error:", exc, flush=True)
    failed = [r for r in results if not r[1]]
    print(f"\nSIT SUMMARY: {len(results) - len(failed)}/{len(results)} passed, {len(failed)} failed", flush=True)
    for n, _, dtl in failed:
        print("  FAILED:", n, "|", dtl[:220], flush=True)
    os._exit(1 if failed else 0)
