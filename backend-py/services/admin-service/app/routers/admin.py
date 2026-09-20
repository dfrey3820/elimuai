"""Admin routes. All require admin/super_admin role."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import AdminOnly, get_principal, get_session
from ..schemas import DashboardOut, PasswordResetIn, SettingsUpdate, UserListOut, UserRoleIn

router = APIRouter(prefix="/api/admin", tags=["admin"])

ALLOWED_SETTING_KEYS = {
    "mpesa_environment", "mpesa_consumer_key", "mpesa_consumer_secret",
    "mpesa_shortcode", "mpesa_passkey", "mpesa_callback_url",
    "at_environment", "at_api_key", "at_username", "at_sender_id",
    "trial_days",
    "school_subscription_amount", "teacher_subscription_amount",
    "parent_subscription_amount", "student_subscription_amount",
    "school_subscription_days", "teacher_subscription_days",
    "parent_subscription_days", "student_subscription_days",
    "smtp_host", "smtp_port", "smtp_user", "smtp_pass",
    "smtp_from_name", "smtp_from_email",
    "billing_quarterly_discount", "billing_semi_annual_discount", "billing_annual_discount",
    "billing_enabled",
}
MASKED_KEYS = {
    "mpesa_consumer_key", "mpesa_consumer_secret", "mpesa_passkey", "at_api_key", "smtp_pass",
}


@router.get("/dashboard", response_model=DashboardOut, dependencies=[AdminOnly])
async def dashboard(sess: AsyncSession = Depends(get_session)):
    users = (await sess.execute(text(
        """
        SELECT
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role = 'student') AS students,
          COUNT(*) FILTER (WHERE role = 'teacher') AS teachers,
          COUNT(*) FILTER (WHERE role = 'parent')  AS parents,
          COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
          COUNT(*) FILTER (WHERE plan != 'free')   AS paid_users
        FROM users
        """
    ))).mappings().first()
    payments = (await sess.execute(text(
        """
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
          COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue
        FROM payments
        """
    ))).mappings().first()
    sms = (await sess.execute(text(
        """
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'sent')   AS sent,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed
        FROM sms_logs
        """
    ))).mappings().first()
    return DashboardOut(
        users=dict(users) if users else {},
        payments=dict(payments) if payments else {},
        sms=dict(sms) if sms else {},
    )


@router.get("/users", response_model=UserListOut, dependencies=[AdminOnly])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: str | None = None,
    plan: str | None = None,
    status: str | None = Query(None, description="active | expired | trial | free"),
    search: str | None = None,
    sess: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    params: dict = {"lim": limit, "off": offset}
    conditions: list[str] = []
    if role:
        conditions.append("role = :role")
        params["role"] = role
    if plan:
        conditions.append("plan = :plan")
        params["plan"] = plan
    if status == "active":
        conditions.append("plan <> 'free' AND plan_expires IS NOT NULL AND plan_expires > NOW()")
    elif status == "expired":
        conditions.append("(plan = 'free' OR plan_expires IS NULL OR plan_expires <= NOW()) "
                          "AND (trial_expires IS NULL OR trial_expires <= NOW())")
    elif status == "trial":
        conditions.append("(plan = 'free' OR plan_expires IS NULL OR plan_expires <= NOW()) "
                          "AND trial_expires IS NOT NULL AND trial_expires > NOW()")
    elif status == "free":
        conditions.append("plan = 'free'")
    if search:
        conditions.append("(name ILIKE :q OR email ILIKE :q OR phone ILIKE :q)")
        params["q"] = f"%{search}%"
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = (await sess.execute(
        text(
            f"""
            SELECT id, name, email, phone, role, plan, plan_expires, trial_expires, country, grade_level,
                   total_xp, streak_days, is_active, last_login, created_at
            FROM users {where} ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """
        ),
        params,
    )).mappings().all()
    count_params = {k: v for k, v in params.items() if k not in ("lim", "off")}
    count_row = (await sess.execute(
        text(f"SELECT COUNT(*) AS c FROM users {where}"),
        count_params,
    )).mappings().first()
    return UserListOut(
        users=[dict(r) for r in rows],
        total=int(count_row["c"]) if count_row else 0,
        page=page,
        limit=limit,
    )


@router.get("/users/{user_id}", dependencies=[AdminOnly])
async def user_detail(user_id: uuid.UUID, sess: AsyncSession = Depends(get_session)):
    user = (await sess.execute(
        text(
            "SELECT id, name, email, phone, role, plan, plan_expires, country, language, grade_level, curriculum, "
            "avatar_url, streak_days, total_xp, is_active, email_verified, phone_verified, "
            "trial_expires, last_login, school_id, created_at FROM users WHERE id = :id"
        ),
        {"id": user_id},
    )).mappings().first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    activity = (await sess.execute(
        text(
            "SELECT activity_type, score, duration_mins, xp_earned, logged_date "
            "FROM progress_logs WHERE user_id = :id ORDER BY created_at DESC LIMIT 20"
        ),
        {"id": user_id},
    )).mappings().all()
    payments = (await sess.execute(
        text(
            "SELECT id, plan, billing_cycle, amount, currency, method, status, phone_number, "
            "mpesa_receipt, created_at, completed_at FROM payments WHERE user_id = :id "
            "ORDER BY created_at DESC LIMIT 20"
        ),
        {"id": user_id},
    )).mappings().all()
    invoices = (await sess.execute(
        text(
            "SELECT id, invoice_number, plan, billing_cycle, amount, currency, status, "
            "period_start, period_end, due_date, paid_at, coupon_code, coupon_discount, subtotal, created_at "
            "FROM invoices WHERE user_id = :id ORDER BY created_at DESC LIMIT 20"
        ),
        {"id": user_id},
    )).mappings().all()
    ai_sessions = (await sess.execute(
        text(
            "SELECT id, type, language, xp_earned, jsonb_array_length(messages) AS message_count, "
            "created_at, updated_at FROM ai_sessions WHERE user_id = :id "
            "ORDER BY created_at DESC LIMIT 20"
        ),
        {"id": user_id},
    )).mappings().all()
    ai_stats = (await sess.execute(
        text(
            "SELECT COUNT(*) AS total_sessions, "
            "COALESCE(SUM(jsonb_array_length(messages)), 0) AS total_messages, "
            "COALESCE(SUM(xp_earned), 0) AS total_ai_xp "
            "FROM ai_sessions WHERE user_id = :id"
        ),
        {"id": user_id},
    )).mappings().first()

    return {
        "user": dict(user),
        "activity": [dict(r) for r in activity],
        "payments": [dict(r) for r in payments],
        "invoices": [dict(r) for r in invoices],
        "aiSessions": [dict(r) for r in ai_sessions],
        "aiStats": dict(ai_stats) if ai_stats else {"total_sessions": 0, "total_messages": 0, "total_ai_xp": 0},
    }


@router.patch("/users/{user_id}/role", dependencies=[AdminOnly])
@router.put("/users/{user_id}/role", dependencies=[AdminOnly])
async def update_user_role(
    user_id: uuid.UUID,
    body: UserRoleIn,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text("UPDATE users SET role = :r, updated_at = NOW() WHERE id = :id "
             "RETURNING id, name, email, role, is_active"),
        {"r": body.role, "id": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    return {"user": dict(row)}


@router.put("/users/{user_id}/toggle-active", dependencies=[AdminOnly])
async def toggle_user_active(
    user_id: uuid.UUID,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text("UPDATE users SET is_active = NOT is_active, updated_at = NOW() "
             "WHERE id = :id RETURNING id, name, email, role, is_active"),
        {"id": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    return {"user": dict(row)}


@router.post("/users/{user_id}/send-verification", dependencies=[AdminOnly])
async def send_verification(
    user_id: uuid.UUID,
    body: dict,
    sess: AsyncSession = Depends(get_session),
):
    """Admin-initiated verification: marks email/phone verified (Node parity)."""
    vtype = (body or {}).get("type", "email")
    if vtype not in ("email", "phone"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "type must be 'email' or 'phone'")
    user = (await sess.execute(
        text("SELECT id, email, phone FROM users WHERE id = :id"),
        {"id": user_id},
    )).mappings().first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if vtype == "email" and not user["email"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User has no email")
    if vtype == "phone" and not user["phone"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User has no phone number")
    field = "email_verified" if vtype == "email" else "phone_verified"
    await sess.execute(
        text(f"UPDATE users SET {field} = TRUE, updated_at = NOW() WHERE id = :id"),  # noqa: S608 — field is whitelisted above
        {"id": user_id},
    )
    await sess.commit()
    return {"message": f"{'Email' if vtype == 'email' else 'Phone'} marked as verified"}


VALID_PLANS = ("free", "student", "family", "school", "enterprise", "teacher", "parent")
VALID_ROLES = ("student", "teacher", "parent", "admin", "super_admin")


@router.post("/users", status_code=status.HTTP_201_CREATED, dependencies=[AdminOnly])
async def create_user(
    body: dict,
    principal=Depends(get_principal),
    sess: AsyncSession = Depends(get_session),
):
    name, email, password = body.get("name"), body.get("email"), body.get("password")
    if not name or not email or not password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name, email and password are required")
    if len(password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 8 characters")
    role = body.get("role") if body.get("role") in VALID_ROLES else "student"
    if role in ("admin", "super_admin") and principal.role != "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only super admins can create admin users")

    exists = (await sess.execute(
        text("SELECT 1 FROM users WHERE email = :e"), {"e": email},
    )).scalar()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    import bcrypt
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
    row = (await sess.execute(
        text(
            "INSERT INTO users (name, email, phone, password_hash, role, country, grade_level, is_active, email_verified) "
            "VALUES (:n, :e, :p, :h, :r, :c, :g, true, true) "
            "RETURNING id, name, email, phone, role, is_active, created_at"
        ),
        {"n": name, "e": email, "p": body.get("phone"), "h": pw_hash,
         "r": role, "c": body.get("country") or "KE", "g": body.get("grade_level")},
    )).mappings().first()
    await sess.commit()
    return {"user": dict(row)}


@router.put("/users/{user_id}/subscription", dependencies=[AdminOnly])
async def update_subscription(
    user_id: uuid.UUID,
    body: dict,
    sess: AsyncSession = Depends(get_session),
):
    plan = body.get("plan")
    if plan not in VALID_PLANS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid plan (valid: {', '.join(VALID_PLANS)})")
    days = int(body.get("days") or 30)
    # asyncpg can't reuse one param as both plan_type and text — branch instead.
    expires_expr = "NULL" if plan == "free" else "NOW() + make_interval(days => :d)"
    params = {"p": plan, "id": user_id} | ({} if plan == "free" else {"d": days})
    row = (await sess.execute(
        text(
            f"UPDATE users SET plan = :p, plan_expires = {expires_expr}, "  # noqa: S608 — expr is a fixed literal
            "updated_at = NOW() WHERE id = :id RETURNING id, name, plan, plan_expires"
        ),
        params,
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    return {"user": dict(row), "message": f"Subscription updated to {plan}"}


@router.delete("/users/{user_id}/subscription", dependencies=[AdminOnly])
async def cancel_subscription(
    user_id: uuid.UUID,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text("UPDATE users SET plan = 'free', plan_expires = NULL, updated_at = NOW() "
             "WHERE id = :id RETURNING id, name, plan"),
        {"id": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    return {"user": dict(row), "message": "Subscription cancelled"}


@router.put("/users/{user_id}/2fa", dependencies=[AdminOnly])
async def toggle_2fa(
    user_id: uuid.UUID,
    body: dict,
    sess: AsyncSession = Depends(get_session),
):
    enabled = bool((body or {}).get("enabled"))
    row = (await sess.execute(
        text("UPDATE users SET email_verified = :v, updated_at = NOW() "
             "WHERE id = :id RETURNING id, name, email_verified"),
        {"v": enabled, "id": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    return {"message": f"2FA {'enabled' if enabled else 'disabled'}", "user": dict(row)}


@router.put("/users/{user_id}/reset-credentials", dependencies=[AdminOnly])
async def reset_credentials(
    user_id: uuid.UUID,
    body: dict,
    sess: AsyncSession = Depends(get_session),
):
    sets, params = [], {"id": user_id}
    if "email" in body:
        sets.append("email = :e"); params["e"] = body.get("email") or None
    if "phone" in body:
        sets.append("phone = :p"); params["p"] = body.get("phone") or None
    if not sets:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    try:
        row = (await sess.execute(
            text(f"UPDATE users SET {', '.join(sets)}, updated_at = NOW() "  # noqa: S608 — sets built from whitelist
                 "WHERE id = :id RETURNING id, name, email, phone"),
            params,
        )).mappings().first()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        await sess.commit()
    except IntegrityError:
        await sess.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or phone already in use")
    return {"user": dict(row), "message": "Credentials updated"}


@router.post("/users/{user_id}/reset-password", dependencies=[AdminOnly])
async def reset_user_password(
    user_id: uuid.UUID,
    body: PasswordResetIn | None = None,
    sess: AsyncSession = Depends(get_session),
):
    import secrets
    import bcrypt

    new_pw = (body.newPassword if body else None) or secrets.token_hex(4)
    pw_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt(rounds=12)).decode()
    row = (await sess.execute(
        text("UPDATE users SET password_hash = :h, updated_at = NOW() "
             "WHERE id = :id RETURNING id, email"),
        {"h": pw_hash, "id": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await sess.commit()
    # Return temp password so admin can relay it (Node parity behaviour).
    return {"message": "Password reset", "tempPassword": new_pw}


@router.get("/transactions", dependencies=[AdminOnly])
async def transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    sess: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    where = ""
    params: dict = {"lim": limit, "off": offset}
    if status_filter:
        where = "WHERE p.status = :st"
        params["st"] = status_filter
    rows = (await sess.execute(
        text(
            f"""
            SELECT p.id, p.plan, p.amount, p.currency, p.method, p.status,
                   p.mpesa_receipt, p.phone_number, p.reference, p.created_at, p.completed_at,
                   p.metadata,
                   u.name AS user_name, u.email AS user_email
            FROM payments p LEFT JOIN users u ON p.user_id = u.id
            {where}
            ORDER BY p.created_at DESC LIMIT :lim OFFSET :off
            """
        ),
        params,
    )).mappings().all()
    count = (await sess.execute(
        text(f"SELECT COUNT(*) AS c FROM payments p {where}"),
        {"st": status_filter} if status_filter else {},
    )).mappings().first()
    return {
        "transactions": [dict(r) for r in rows],
        "total": int(count["c"]) if count else 0,
        "page": page,
        "limit": limit,
    }


@router.get("/sms-logs", dependencies=[AdminOnly])
async def sms_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    provider: str | None = None,
    sess: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    conditions: list[str] = []
    params: dict = {"lim": limit, "off": offset}
    if status_filter:
        conditions.append("status = :st")
        params["st"] = status_filter
    if provider:
        conditions.append("provider = :prov")
        params["prov"] = provider
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = (await sess.execute(
        text(
            f"""
            SELECT id, recipient, message, provider, status, metadata, created_at
            FROM sms_logs
            {where}
            ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """
        ),
        params,
    )).mappings().all()
    count_params = {k: v for k, v in params.items() if k not in ("lim", "off")}
    count = (await sess.execute(
        text(f"SELECT COUNT(*) AS c FROM sms_logs {where}"),
        count_params,
    )).mappings().first()
    return {
        "logs": [dict(r) for r in rows],
        "total": int(count["c"]) if count else 0,
        "page": page,
        "limit": limit,
    }


@router.get("/settings", dependencies=[AdminOnly])
async def get_settings(sess: AsyncSession = Depends(get_session)):
    rows = (await sess.execute(text("SELECT key, value FROM admin_settings"))).mappings().all()
    settings_out: dict[str, str] = {}
    for r in rows:
        v = r["value"]
        if r["key"] in MASKED_KEYS and v and len(v) > 4:
            v = "••••" + v[-4:]
        settings_out[r["key"]] = v
    return {"settings": settings_out}


@router.put("/settings", dependencies=[AdminOnly])
async def update_settings(
    body: SettingsUpdate,
    sess: AsyncSession = Depends(get_session),
):
    updates = body.model_dump()
    n = 0
    for key, val in updates.items():
        if key not in ALLOWED_SETTING_KEYS:
            continue
        if isinstance(val, str) and val.startswith("••••"):
            continue  # unchanged masked value
        await sess.execute(
            text(
                "INSERT INTO admin_settings (key, value, updated_at) VALUES (:k, :v, NOW()) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            ),
            {"k": key, "v": str(val)},
        )
        n += 1
    await sess.commit()
    return {"updated": n}
