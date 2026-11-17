"""Direct sales agent endpoints.

A standalone sales channel, separate from the marketing/network agents
(see agents.py). Two audiences:

  * Sales agents themselves (role='sales_agent') hitting /api/sales-agents/me/...
  * Admins / super_admins managing agents at /api/sales-agents/ (list, create, pay).

Attribution: sales_agent_referrals rows are created either
  (a) by auth-service when a new user registers with ?ref=CODE, or
  (b) by an agent calling POST /api/sales-agents/me/customers (or /me/schools).

Commissions are auto-created by the trg_award_sales_commission_* MySQL triggers
when a payment transitions to 'completed' — see scripts/014_direct_sales_agents.mysql.sql.
The commission rate is the agent's own override, or the global default in
admin_settings('sales_agent_commission_rate'). Commission is first-payment-only.

Agents can also nudge their own customers to renew via
POST /api/sales-agents/me/customers/{user_id}/remind (rate-limited).
"""
from __future__ import annotations

import json
import secrets
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import AdminOnly, current_principal, get_event_bus, get_session

router = APIRouter(prefix="/api/sales-agents", tags=["sales-agents"])

# A customer can only be reminded once within this many days (per agent action).
REMINDER_COOLDOWN_DAYS = 3


# ─── Schemas ────────────────────────────────────────────────────────────────


class SalesAgentCreateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    user_id: uuid.UUID | None = Field(default=None, validation_alias=AliasChoices("user_id", "userId"))
    email: EmailStr | None = None
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = None
    agent_code: str | None = Field(default=None, min_length=3, max_length=32,
                                   validation_alias=AliasChoices("agent_code", "agentCode"))
    # None => use the global default rate.
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1,
                                            validation_alias=AliasChoices("commission_rate", "commissionRate"))
    payout_method: str | None = Field(default=None, validation_alias=AliasChoices("payout_method", "payoutMethod"))
    payout_details: dict = Field(default_factory=dict,
                                 validation_alias=AliasChoices("payout_details", "payoutDetails"))
    notes: str | None = None


class SalesAgentUpdateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1,
                                            validation_alias=AliasChoices("commission_rate", "commissionRate"))
    is_active: bool | None = Field(default=None, validation_alias=AliasChoices("is_active", "isActive"))
    payout_method: str | None = Field(default=None, validation_alias=AliasChoices("payout_method", "payoutMethod"))
    payout_details: dict | None = Field(default=None, validation_alias=AliasChoices("payout_details", "payoutDetails"))
    notes: str | None = None


class OnboardCustomerIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = None
    role: Literal["student", "teacher", "parent"] = "student"
    country: str = "KE"
    notes: str | None = None


class OnboardSchoolIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    school_name: str = Field(min_length=2, max_length=255,
                             validation_alias=AliasChoices("school_name", "schoolName"))
    admin_name: str = Field(min_length=2, max_length=100,
                            validation_alias=AliasChoices("admin_name", "adminName"))
    admin_email: EmailStr = Field(validation_alias=AliasChoices("admin_email", "adminEmail"))
    admin_phone: str | None = Field(default=None,
                                    validation_alias=AliasChoices("admin_phone", "adminPhone"))
    country: str = "KE"
    county: str | None = None
    curriculum: str = "CBC"
    notes: str | None = None


class CommissionPayIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    payout_reference: str | None = Field(default=None, validation_alias=AliasChoices("payout_reference", "payoutReference"))
    notes: str | None = None


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _generate_agent_code(name: str | None = None) -> str:
    """Short, human-friendly agent code (SLS prefix to avoid clashing with marketing codes)."""
    prefix = "".join(c for c in (name or "").upper() if c.isalnum())[:3] or "SLS"
    return f"S{prefix}{secrets.token_hex(3).upper()}"


def _gen_temp_password(n: int = 10) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def _dumps(value: dict) -> str:
    return json.dumps(value or {})


async def _load_agent_by_user(sess: AsyncSession, user_id: uuid.UUID) -> dict | None:
    row = (await sess.execute(
        text("SELECT * FROM sales_agents WHERE user_id = :u LIMIT 1"),
        {"u": user_id},
    )).mappings().first()
    return dict(row) if row else None


async def _global_rate(sess: AsyncSession) -> Decimal:
    val = (await sess.execute(
        text("SELECT value FROM admin_settings WHERE `key` = 'sales_agent_commission_rate' LIMIT 1")
    )).scalar_one_or_none()
    try:
        return Decimal(str(val)) if val is not None else Decimal("0.10")
    except Exception:  # noqa: BLE001
        return Decimal("0.10")


def _serialize_agent(row: dict) -> dict:
    out = dict(row)
    for k in ("id", "user_id"):
        if k in out and out[k] is not None:
            out[k] = str(out[k])
    for k in ("commission_rate", "effective_rate", "commission_amount", "base_amount"):
        if k in out and isinstance(out[k], Decimal):
            out[k] = float(out[k])
    for k in ("created_at", "updated_at", "paid_at", "plan_expires"):
        if k in out and isinstance(out[k], datetime):
            out[k] = out[k].isoformat()
    return out


async def _require_active_agent(sess: AsyncSession, principal) -> dict:
    agent = await _load_agent_by_user(sess, uuid.UUID(principal.user_id))
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a sales agent")
    if not agent["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your sales agent account is inactive")
    return agent


# ─── Agent self-service ─────────────────────────────────────────────────────


@router.get("/me")
async def agent_me(principal=current_principal, sess: AsyncSession = Depends(get_session)):
    agent = await _load_agent_by_user(sess, uuid.UUID(principal.user_id))
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a sales agent")

    stats = (await sess.execute(text(
        """
        SELECT
          (SELECT COUNT(*) FROM sales_agent_referrals WHERE agent_id = :a) AS referrals,
          (SELECT COUNT(*) FROM sales_agent_commissions WHERE agent_id = :a) AS commissions,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM sales_agent_commissions
             WHERE agent_id = :a AND status = 'pending') AS pending_amount,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM sales_agent_commissions
             WHERE agent_id = :a AND status = 'paid') AS paid_amount
        """
    ), {"a": agent["id"]})).mappings().first()

    out = _serialize_agent(agent)
    # Surface the rate actually used (own override, else global default).
    if agent.get("commission_rate") is None:
        out["effective_rate"] = float(await _global_rate(sess))
    else:
        out["effective_rate"] = float(agent["commission_rate"])
    return {"agent": out, "stats": dict(stats or {})}


@router.get("/me/referrals")
async def agent_my_referrals(
    principal=current_principal, sess: AsyncSession = Depends(get_session),
    limit: int = Query(100, ge=1, le=500),
):
    agent = await _load_agent_by_user(sess, uuid.UUID(principal.user_id))
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a sales agent")
    rows = (await sess.execute(text(
        """
        SELECT sr.id, sr.user_id, sr.source, sr.created_at,
               u.name, u.email, u.phone, u.plan, u.plan_expires,
               (SELECT commission_amount FROM sales_agent_commissions ac
                  WHERE ac.referral_id = sr.id LIMIT 1) AS commission_amount,
               (SELECT status FROM sales_agent_commissions ac
                  WHERE ac.referral_id = sr.id LIMIT 1) AS commission_status,
               (SELECT MAX(sent_at) FROM subscription_reminders r
                  WHERE r.user_id = sr.user_id AND r.kind = 'sales_agent_manual') AS last_reminded_at
        FROM sales_agent_referrals sr
        JOIN users u ON u.id = sr.user_id
        WHERE sr.agent_id = :a
        ORDER BY sr.created_at DESC
        LIMIT :lim
        """
    ), {"a": agent["id"], "lim": limit})).mappings().all()
    return {"referrals": [_serialize_agent(dict(r)) for r in rows]}


@router.get("/me/commissions")
async def agent_my_commissions(
    principal=current_principal, sess: AsyncSession = Depends(get_session),
    status_: str | None = Query(default=None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
):
    agent = await _load_agent_by_user(sess, uuid.UUID(principal.user_id))
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a sales agent")

    q = ["SELECT c.*, u.name AS user_name, u.email AS user_email",
         "FROM sales_agent_commissions c JOIN users u ON u.id = c.user_id",
         "WHERE c.agent_id = :a"]
    params: dict = {"a": agent["id"], "lim": limit}
    if status_:
        q.append("AND c.status = :st")
        params["st"] = status_
    q.append("ORDER BY c.created_at DESC LIMIT :lim")
    rows = (await sess.execute(text(" ".join(q)), params)).mappings().all()
    return {"commissions": [_serialize_agent(dict(r)) for r in rows]}


@router.post("/me/customers", status_code=status.HTTP_201_CREATED)
async def agent_onboard_customer(
    body: OnboardCustomerIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    """Agent creates a new customer, attributes the referral, and dispatches
    temporary login credentials. The customer must reset their password and
    verify their email (via OTP) on first login.
    """
    agent = await _require_active_agent(sess, principal)

    existing = (await sess.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": body.email}
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists")

    temp_password = _gen_temp_password()
    new_user_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO users (id, name, email, phone, password_hash, must_reset_password,
                           role, country, is_active, email_verified, onboarded)
        VALUES (:id, :n, :e, :p, :pw, true, :r, :c, true, false, false)
        """
    ), {"id": new_user_id, "n": body.name, "e": body.email, "p": body.phone,
        "pw": _hash_password(temp_password), "r": body.role, "c": body.country})

    await sess.execute(text(
        """
        INSERT INTO sales_agent_referrals (id, agent_id, user_id, source)
        VALUES (:rid, :a, :u, 'agent_added')
        """
    ), {"rid": str(uuid.uuid4()), "a": agent["id"], "u": new_user_id})
    await sess.commit()

    await bus.publish("user.onboarded", {
        "user_id": new_user_id,
        "email": body.email,
        "name": body.name,
        "role": body.role,
        "school_name": "ElimuAI",
        "temp_password": temp_password,
    })

    return {"user_id": new_user_id, "email": body.email, "message": "Customer onboarded"}


@router.post("/me/schools", status_code=status.HTTP_201_CREATED)
async def agent_onboard_school(
    body: OnboardSchoolIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    """Agent registers a new school and its first admin, attributing the referral.
    The commission accrues when the school admin completes their first payment.
    """
    agent = await _require_active_agent(sess, principal)

    existing = (await sess.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": body.admin_email}
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that admin email already exists")

    new_school_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO schools (id, name, country, county, curriculum, email, phone, plan, is_active)
        VALUES (:id, :n, :c, :co, :cur, :e, :p, 'free', true)
        """
    ), {
        "id": new_school_id, "n": body.school_name, "c": body.country, "co": body.county,
        "cur": body.curriculum, "e": body.admin_email, "p": body.admin_phone,
    })

    temp_password = _gen_temp_password()
    new_user_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO users (id, school_id, name, email, phone, password_hash, must_reset_password,
                           role, country, curriculum, is_active, email_verified, onboarded)
        VALUES (:id, :sid, :n, :e, :p, :pw, true, 'admin', :c, :cur, true, false, false)
        """
    ), {
        "id": new_user_id, "sid": new_school_id, "n": body.admin_name, "e": body.admin_email,
        "p": body.admin_phone, "pw": _hash_password(temp_password), "c": body.country, "cur": body.curriculum,
    })

    await sess.execute(text(
        """
        INSERT INTO sales_agent_referrals (id, agent_id, user_id, source)
        VALUES (:rid, :a, :u, 'agent_added')
        """
    ), {"rid": str(uuid.uuid4()), "a": agent["id"], "u": new_user_id})
    await sess.commit()

    await bus.publish("user.onboarded", {
        "user_id": new_user_id,
        "email": body.admin_email,
        "name": body.admin_name,
        "role": "admin",
        "school_name": body.school_name,
        "temp_password": temp_password,
    })

    return {
        "school_id": new_school_id,
        "admin_user_id": new_user_id,
        "admin_email": body.admin_email,
        "message": "School onboarded",
    }


@router.post("/me/customers/{customer_id}/remind")
async def agent_remind_customer(
    customer_id: uuid.UUID,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    """Send a renewal reminder to one of the agent's own customers.

    Ownership-checked (the customer must be attributed to this agent) and
    rate-limited to one send per ``REMINDER_COOLDOWN_DAYS``.
    """
    agent = await _require_active_agent(sess, principal)

    cust = (await sess.execute(text(
        """
        SELECT u.id, u.name, u.email, u.plan, u.plan_expires
        FROM sales_agent_referrals sr
        JOIN users u ON u.id = sr.user_id
        WHERE sr.agent_id = :a AND sr.user_id = :u
        LIMIT 1
        """
    ), {"a": agent["id"], "u": customer_id})).mappings().first()
    if not cust:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That customer is not one of yours")
    if not cust["email"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Customer has no email on file")

    recent = (await sess.execute(text(
        """
        SELECT 1 FROM subscription_reminders
        WHERE user_id = :u AND kind = 'sales_agent_manual'
          AND sent_at > NOW() - INTERVAL :days DAY
        LIMIT 1
        """
    ), {"u": customer_id, "days": REMINDER_COOLDOWN_DAYS})).scalar_one_or_none()
    if recent:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"You already reminded this customer in the last {REMINDER_COOLDOWN_DAYS} days.",
        )

    agent_name = (await sess.execute(
        text("SELECT name FROM users WHERE id = :u"), {"u": agent["user_id"]}
    )).scalar_one_or_none()

    expires = cust["plan_expires"]
    days_left = None
    if isinstance(expires, datetime):
        from datetime import timezone
        now = datetime.now(timezone.utc) if expires.tzinfo else datetime.utcnow()
        days_left = (expires - now).days

    await bus.publish("billing.sales_agent_manual_reminder", {
        "email": cust["email"],
        "name": cust["name"] or "there",
        "plan": cust["plan"] or "your plan",
        "plan_expires": expires.isoformat() if isinstance(expires, datetime) else None,
        "days_left": days_left,
        "agent_name": agent_name or "Your ElimuAI agent",
    })

    await sess.execute(text(
        """
        INSERT INTO subscription_reminders (user_id, kind, reference)
        VALUES (:u, 'sales_agent_manual', :ref)
        ON DUPLICATE KEY UPDATE sent_at = NOW()
        """
    ), {"u": str(customer_id), "ref": datetime.utcnow().date()})
    await sess.commit()

    return {"message": "Reminder sent", "customer_id": str(customer_id)}


# ─── Admin management ───────────────────────────────────────────────────────


@router.get("/", dependencies=[AdminOnly])
async def list_agents(
    sess: AsyncSession = Depends(get_session),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
):
    q = [
        "SELECT sa.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,",
        "  (SELECT COUNT(*) FROM sales_agent_referrals sr WHERE sr.agent_id = sa.id) AS referral_count,",
        "  (SELECT COALESCE(SUM(commission_amount),0) FROM sales_agent_commissions ac",
        "    WHERE ac.agent_id = sa.id AND ac.status='pending') AS pending_amount,",
        "  (SELECT COALESCE(SUM(commission_amount),0) FROM sales_agent_commissions ac",
        "    WHERE ac.agent_id = sa.id AND ac.status='paid') AS paid_amount",
        "FROM sales_agents sa",
        "JOIN users u ON u.id = sa.user_id",
        "WHERE 1=1",
    ]
    params: dict = {"lim": limit}
    if is_active is not None:
        q.append("AND sa.is_active = :act")
        params["act"] = is_active
    if search:
        q.append("AND (u.email LIKE :s OR u.name LIKE :s OR sa.agent_code LIKE :s)")
        params["s"] = f"%{search}%"
    q.append("ORDER BY sa.created_at DESC LIMIT :lim")
    rows = (await sess.execute(text(" ".join(q)), params)).mappings().all()
    default_rate = float(await _global_rate(sess))
    agents = []
    for r in rows:
        a = _serialize_agent(dict(r))
        a["effective_rate"] = a["commission_rate"] if a.get("commission_rate") is not None else default_rate
        agents.append(a)
    return {"agents": agents, "default_rate": default_rate}


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[AdminOnly])
async def create_agent(
    body: SalesAgentCreateIn,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    if not body.user_id and not body.email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "user_id or email is required")

    if body.user_id:
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE id = :u"), {"u": body.user_id},
        )).mappings().first()
    else:
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE email = :e"), {"e": body.email},
        )).mappings().first()

    temp_password: str | None = None
    if not user_row:
        if not body.email or not body.name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "To create a new agent, provide both name and email.")
        temp_password = _gen_temp_password()
        new_uid = str(uuid.uuid4())
        await sess.execute(text(
            """
            INSERT INTO users (id, name, email, phone, password_hash, must_reset_password,
                               role, is_active, email_verified, onboarded)
            VALUES (:id, :n, :e, :p, :pw, true, 'sales_agent', true, false, true)
            """
        ), {"id": new_uid, "n": body.name, "e": body.email, "p": body.phone,
            "pw": _hash_password(temp_password)})
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE id = :u"), {"u": new_uid}
        )).mappings().first()

    exists = await _load_agent_by_user(sess, user_row["id"])
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "This user is already a sales agent")

    code = (body.agent_code or _generate_agent_code(user_row.get("name"))).upper().replace(" ", "")
    for _ in range(5):
        clash = (await sess.execute(
            text(
                "SELECT 1 FROM sales_agents WHERE agent_code = :c "
                "UNION SELECT 1 FROM marketing_agents WHERE agent_code = :c"
            ),
            {"c": code},
        )).scalar_one_or_none()
        if not clash:
            break
        code = _generate_agent_code(user_row.get("name"))
    else:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate unique agent code")

    new_agent_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO sales_agents
          (id, user_id, agent_code, commission_rate, payout_method, payout_details, notes)
        VALUES (:id, :u, :c, :r, :pm, :pd, :n)
        """
    ), {
        "id": new_agent_id, "u": user_row["id"], "c": code,
        "r": body.commission_rate, "pm": body.payout_method,
        "pd": _dumps(body.payout_details or {}), "n": body.notes,
    })
    row = (await sess.execute(
        text("SELECT * FROM sales_agents WHERE id = :id"), {"id": new_agent_id}
    )).mappings().first()

    if user_row["role"] not in ("admin", "super_admin", "sales_agent"):
        await sess.execute(
            text("UPDATE users SET role = 'sales_agent' WHERE id = :u"), {"u": user_row["id"]}
        )

    await sess.commit()

    if temp_password and user_row.get("email"):
        await bus.publish("user.onboarded", {
            "user_id": str(user_row["id"]),
            "email": user_row["email"],
            "name": user_row.get("name") or "there",
            "role": "direct sales agent",
            "school_name": "the ElimuAI Sales Team",
            "temp_password": temp_password,
        })

    return {"agent": _serialize_agent(dict(row))}


@router.patch("/{agent_id}", dependencies=[AdminOnly])
async def update_agent(agent_id: uuid.UUID, body: SalesAgentUpdateIn, sess: AsyncSession = Depends(get_session)):
    updates: dict = {}
    # commission_rate is nullable: an explicit null clears the override (use global default).
    fields_set = body.model_dump(exclude_unset=True)
    if "commission_rate" in fields_set:
        updates["commission_rate"] = body.commission_rate
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    if body.payout_method is not None:
        updates["payout_method"] = body.payout_method
    if body.payout_details is not None:
        updates["payout_details"] = _dumps(body.payout_details)
    if body.notes is not None:
        updates["notes"] = body.notes
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    await sess.execute(
        text(f"UPDATE sales_agents SET {set_clause}, updated_at = NOW() WHERE id = :id"),
        {**updates, "id": agent_id},
    )
    row = (await sess.execute(
        text("SELECT * FROM sales_agents WHERE id = :id"), {"id": agent_id}
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    await sess.commit()
    return {"agent": _serialize_agent(dict(row))}


@router.get("/commissions/all", dependencies=[AdminOnly])
async def list_all_commissions(
    sess: AsyncSession = Depends(get_session),
    status_: str | None = Query(default=None, alias="status"),
    agent_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(200, ge=1, le=1000),
):
    q = [
        "SELECT c.*, sa.agent_code, sa.user_id AS agent_user_id,",
        "  au.name AS agent_name, au.email AS agent_email,",
        "  u.name AS user_name, u.email AS user_email",
        "FROM sales_agent_commissions c",
        "JOIN sales_agents sa ON sa.id = c.agent_id",
        "JOIN users au ON au.id = sa.user_id",
        "JOIN users u ON u.id = c.user_id",
        "WHERE 1=1",
    ]
    params: dict = {"lim": limit}
    if status_:
        q.append("AND c.status = :st")
        params["st"] = status_
    if agent_id:
        q.append("AND c.agent_id = :a")
        params["a"] = agent_id
    q.append("ORDER BY c.created_at DESC LIMIT :lim")
    rows = (await sess.execute(text(" ".join(q)), params)).mappings().all()
    return {"commissions": [_serialize_agent(dict(r)) for r in rows]}


@router.post("/commissions/{commission_id}/pay", dependencies=[AdminOnly])
async def mark_commission_paid(
    commission_id: uuid.UUID,
    body: CommissionPayIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    upd = await sess.execute(text(
        """
        UPDATE sales_agent_commissions
           SET status = 'paid', paid_at = NOW(), paid_by = :who,
               payout_reference = :ref, notes = COALESCE(:notes, notes)
         WHERE id = :id AND status = 'pending'
        """
    ), {"id": commission_id, "who": uuid.UUID(principal.user_id),
        "ref": body.payout_reference, "notes": body.notes})
    if upd.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found or already paid")
    row = (await sess.execute(
        text("SELECT * FROM sales_agent_commissions WHERE id = :id"), {"id": commission_id}
    )).mappings().first()
    await sess.commit()
    return {"commission": _serialize_agent(dict(row))}


@router.post("/commissions/{commission_id}/void", dependencies=[AdminOnly])
async def void_commission(
    commission_id: uuid.UUID,
    body: CommissionPayIn,
    sess: AsyncSession = Depends(get_session),
):
    upd = await sess.execute(text(
        """
        UPDATE sales_agent_commissions
           SET status = 'void', notes = COALESCE(:notes, notes)
         WHERE id = :id AND status = 'pending'
        """
    ), {"id": commission_id, "notes": body.notes})
    if upd.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found or not pending")
    row = (await sess.execute(
        text("SELECT * FROM sales_agent_commissions WHERE id = :id"), {"id": commission_id}
    )).mappings().first()
    await sess.commit()
    return {"commission": _serialize_agent(dict(row))}


@router.get("/{agent_id}", dependencies=[AdminOnly])
async def get_agent(agent_id: uuid.UUID, sess: AsyncSession = Depends(get_session)):
    row = (await sess.execute(text(
        """
        SELECT sa.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
        FROM sales_agents sa JOIN users u ON u.id = sa.user_id
        WHERE sa.id = :id
        """
    ), {"id": agent_id})).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    return {"agent": _serialize_agent(dict(row))}
