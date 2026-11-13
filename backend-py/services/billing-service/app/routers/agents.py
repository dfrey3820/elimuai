"""Marketing agents endpoints.

Two audiences:
  * Agents themselves (role='marketing_agent') hitting /api/agents/me/...
  * Admins / super_admins managing agents at /api/agents/ (list, create, pay).

Attribution: agent_referrals rows are created either
  (a) by auth-service when a new user registers with ?ref=CODE, or
  (b) by an agent calling POST /api/agents/me/customers to onboard someone.

Commissions are auto-created by the fn_award_agent_commission Postgres trigger
when a payment transitions to 'completed' — see scripts/010_marketing_agents.sql.
Commissions can be paid or voided by admins via /api/agents/commissions/{id}/...
"""
from __future__ import annotations

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

router = APIRouter(prefix="/api/agents", tags=["agents"])


# ─── Schemas ────────────────────────────────────────────────────────────────


class AgentCreateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    user_id: uuid.UUID | None = Field(default=None, validation_alias=AliasChoices("user_id", "userId"))
    email: EmailStr | None = None
    # When the email has no account yet, these let us create one and dispatch
    # temporary credentials automatically.
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = None
    tier: Literal["manager", "agent"] = "agent"
    manager_id: uuid.UUID | None = Field(default=None, validation_alias=AliasChoices("manager_id", "managerId"))
    agent_code: str | None = Field(default=None, min_length=3, max_length=32,
                                   validation_alias=AliasChoices("agent_code", "agentCode"))
    commission_rate: Decimal = Field(default=Decimal("0.15"), ge=0, le=1,
                                     validation_alias=AliasChoices("commission_rate", "commissionRate"))
    override_rate: Decimal = Field(default=Decimal("0.05"), ge=0, le=1,
                                   validation_alias=AliasChoices("override_rate", "overrideRate"))
    payout_method: str | None = Field(default=None, validation_alias=AliasChoices("payout_method", "payoutMethod"))
    payout_details: dict = Field(default_factory=dict,
                                 validation_alias=AliasChoices("payout_details", "payoutDetails"))
    notes: str | None = None


class AgentUpdateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1,
                                            validation_alias=AliasChoices("commission_rate", "commissionRate"))
    override_rate: Decimal | None = Field(default=None, ge=0, le=1,
                                          validation_alias=AliasChoices("override_rate", "overrideRate"))
    manager_id: uuid.UUID | None = Field(default=None, validation_alias=AliasChoices("manager_id", "managerId"))
    is_active: bool | None = Field(default=None, validation_alias=AliasChoices("is_active", "isActive"))
    payout_method: str | None = Field(default=None, validation_alias=AliasChoices("payout_method", "payoutMethod"))
    payout_details: dict | None = Field(default=None, validation_alias=AliasChoices("payout_details", "payoutDetails"))
    notes: str | None = None


class OnboardCustomerIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = None
    # Agents may only create end-customer accounts — never admin/super_admin.
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
    """Short, human-friendly agent code."""
    prefix = "".join(c for c in (name or "").upper() if c.isalnum())[:4] or "AGT"
    return f"{prefix}{secrets.token_hex(3).upper()}"


def _gen_temp_password(n: int = 10) -> str:
    """Temporary password with unambiguous characters."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


async def _load_agent_by_user(sess: AsyncSession, user_id: uuid.UUID) -> dict | None:
    row = (await sess.execute(
        text("SELECT * FROM marketing_agents WHERE user_id = :u LIMIT 1"),
        {"u": user_id},
    )).mappings().first()
    return dict(row) if row else None


async def _load_agent_by_id(sess: AsyncSession, agent_id: uuid.UUID) -> dict | None:
    row = (await sess.execute(
        text("SELECT * FROM marketing_agents WHERE id = :i LIMIT 1"),
        {"i": agent_id},
    )).mappings().first()
    return dict(row) if row else None


def _current_agent_gate(principal, agent: dict | None):
    """Allow the agent themselves OR admin/super_admin."""
    if principal.has_role("admin"):
        return
    if not agent or str(agent["user_id"]) != principal.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your agent record")


# ─── Agent self-service ─────────────────────────────────────────────────────


@router.get("/me")
async def agent_me(principal=current_principal, sess: AsyncSession = Depends(get_session)):
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a marketing agent")

    # Summary counts
    stats = (await sess.execute(text(
        """
        SELECT
          (SELECT COUNT(*) FROM agent_referrals WHERE agent_id = :a) AS referrals,
          (SELECT COUNT(*) FROM agent_commissions WHERE agent_id = :a) AS commissions,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM agent_commissions
             WHERE agent_id = :a AND status = 'pending') AS pending_amount,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM agent_commissions
             WHERE agent_id = :a AND status = 'paid') AS paid_amount
        """
    ), {"a": agent["id"]})).mappings().first()

    return {"agent": _serialize_agent(agent), "stats": dict(stats or {})}


@router.get("/me/referrals")
async def agent_my_referrals(
    principal=current_principal, sess: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
):
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a marketing agent")
    rows = (await sess.execute(text(
        """
        SELECT ar.id, ar.user_id, ar.source, ar.created_at,
               u.name, u.email, u.phone, u.plan, u.plan_expires,
               (SELECT commission_amount FROM agent_commissions ac
                  WHERE ac.referral_id = ar.id LIMIT 1) AS commission_amount,
               (SELECT status FROM agent_commissions ac
                  WHERE ac.referral_id = ar.id LIMIT 1) AS commission_status
        FROM agent_referrals ar
        JOIN users u ON u.id = ar.user_id
        WHERE ar.agent_id = :a
        ORDER BY ar.created_at DESC
        LIMIT :lim
        """
    ), {"a": agent["id"], "lim": limit})).mappings().all()
    return {"referrals": [dict(r) for r in rows]}


@router.get("/me/commissions")
async def agent_my_commissions(
    principal=current_principal, sess: AsyncSession = Depends(get_session),
    status_: str | None = Query(default=None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
):
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a marketing agent")

    q = ["SELECT c.*, u.name AS user_name, u.email AS user_email",
         "FROM agent_commissions c JOIN users u ON u.id = c.user_id",
         "WHERE c.agent_id = :a"]
    params: dict = {"a": agent["id"], "lim": limit}
    if status_:
        q.append("AND c.status = :st")
        params["st"] = status_
    q.append("ORDER BY c.created_at DESC LIMIT :lim")
    rows = (await sess.execute(text(" ".join(q)), params)).mappings().all()
    return {"commissions": [dict(r) for r in rows]}


@router.get("/me/team")
async def agent_my_team(principal=current_principal, sess: AsyncSession = Depends(get_session)):
    """Managers see the agents reporting to them, with each agent's performance."""
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not registered as a marketing agent")
    if agent.get("tier") != "manager":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only managers have a team")

    rows = (await sess.execute(text(
        """
        SELECT ma.id, ma.agent_code, ma.commission_rate, ma.is_active,
               u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
               (SELECT COUNT(*) FROM agent_referrals ar WHERE ar.agent_id = ma.id) AS referral_count,
               (SELECT COALESCE(SUM(commission_amount),0) FROM agent_commissions ac
                  WHERE ac.agent_id = ma.id AND ac.status='pending') AS pending_amount,
               (SELECT COALESCE(SUM(commission_amount),0) FROM agent_commissions ac
                  WHERE ac.agent_id = ma.id AND ac.status='paid') AS paid_amount
        FROM marketing_agents ma
        JOIN users u ON u.id = ma.user_id
        WHERE ma.manager_id = :m
        ORDER BY u.name
        """
    ), {"m": agent["id"]})).mappings().all()
    return {"team": [_serialize_agent(dict(r)) for r in rows]}


@router.post("/me/customers", status_code=status.HTTP_201_CREATED)
async def agent_onboard_customer(
    body: OnboardCustomerIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Agent creates a new user (unverified) and attributes the referral to themselves.

    The user still needs to complete registration (set password, verify email) —
    an admin or a follow-up flow issues them a signup token. For now we create
    the user record with role='student' and password_hash=NULL so the agent
    can hand off signup instructions containing the email.
    """
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent or not agent["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not an active marketing agent")

    # Reject duplicates
    existing = (await sess.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": body.email}
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists")

    new_user_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO users (id, name, email, phone, role, country, onboarded)
        VALUES (:id, :n, :e, :p, :r, :c, false)
        """
    ), {"id": new_user_id, "n": body.name, "e": body.email, "p": body.phone, "r": body.role, "c": body.country})

    await sess.execute(text(
        """
        INSERT INTO agent_referrals (agent_id, user_id, source)
        VALUES (:a, :u, 'agent_added')
        """
    ), {"a": agent["id"], "u": new_user_id})
    await sess.commit()

    return {"user_id": str(new_user_id), "email": body.email, "message": "Customer onboarded"}


@router.post("/me/schools", status_code=status.HTTP_201_CREATED)
async def agent_onboard_school(
    body: OnboardSchoolIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Agent registers a new school and its first admin, attributing the referral.

    Creates a school (free plan) plus an admin user (password_hash=NULL, unverified)
    and links the referral to the admin. The commission accrues when the school
    admin completes their first payment. The admin still has to finish signup
    (set a password / verify email) via the normal flow using this email.
    """
    uid = uuid.UUID(principal.user_id)
    agent = await _load_agent_by_user(sess, uid)
    if not agent or not agent["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not an active marketing agent")

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

    new_user_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO users (id, school_id, name, email, phone, role, country, curriculum, onboarded)
        VALUES (:id, :sid, :n, :e, :p, 'admin', :c, :cur, false)
        """
    ), {
        "id": new_user_id, "sid": new_school_id, "n": body.admin_name, "e": body.admin_email,
        "p": body.admin_phone, "c": body.country, "cur": body.curriculum,
    })

    await sess.execute(text(
        """
        INSERT INTO agent_referrals (id, agent_id, user_id, source)
        VALUES (:rid, :a, :u, 'agent_added')
        """
    ), {"rid": str(uuid.uuid4()), "a": agent["id"], "u": new_user_id})
    await sess.commit()

    return {
        "school_id": new_school_id,
        "admin_user_id": new_user_id,
        "admin_email": body.admin_email,
        "message": "School onboarded",
    }


# ─── Admin management ───────────────────────────────────────────────────────


@router.get("/", dependencies=[AdminOnly])
async def list_agents(
    sess: AsyncSession = Depends(get_session),
    is_active: bool | None = Query(default=None),
    tier: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
):
    q = [
        "SELECT ma.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,",
        "  mu.name AS manager_name,",
        "  (SELECT COUNT(*) FROM agent_referrals ar WHERE ar.agent_id = ma.id) AS referral_count,",
        "  (SELECT COUNT(*) FROM marketing_agents sub WHERE sub.manager_id = ma.id) AS team_size,",
        "  (SELECT COALESCE(SUM(commission_amount),0) FROM agent_commissions ac",
        "    WHERE ac.agent_id = ma.id AND ac.status='pending') AS pending_amount,",
        "  (SELECT COALESCE(SUM(commission_amount),0) FROM agent_commissions ac",
        "    WHERE ac.agent_id = ma.id AND ac.status='paid') AS paid_amount",
        "FROM marketing_agents ma",
        "JOIN users u ON u.id = ma.user_id",
        "LEFT JOIN marketing_agents mm ON mm.id = ma.manager_id",
        "LEFT JOIN users mu ON mu.id = mm.user_id",
        "WHERE 1=1",
    ]
    params: dict = {"lim": limit}
    if is_active is not None:
        q.append("AND ma.is_active = :act")
        params["act"] = is_active
    if tier:
        q.append("AND ma.tier = :tier")
        params["tier"] = tier
    if search:
        q.append("AND (u.email LIKE :s OR u.name LIKE :s OR ma.agent_code LIKE :s)")
        params["s"] = f"%{search}%"
    q.append("ORDER BY ma.created_at DESC LIMIT :lim")
    rows = (await sess.execute(text(" ".join(q)), params)).mappings().all()
    return {"agents": [_serialize_agent(dict(r)) for r in rows]}


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[AdminOnly])
async def create_agent(
    body: AgentCreateIn,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    # Resolve user — or provision a brand-new one with temporary credentials.
    if not body.user_id and not body.email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "user_id or email is required")

    if body.user_id:
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE id = :u"),
            {"u": body.user_id},
        )).mappings().first()
    else:
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE email = :e"),
            {"e": body.email},
        )).mappings().first()

    temp_password: str | None = None
    if not user_row:
        # Auto-provision: create the account and dispatch temp credentials.
        if not body.email or not body.name:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "To create a new agent, provide both name and email.",
            )
        temp_password = _gen_temp_password()
        new_uid = str(uuid.uuid4())
        await sess.execute(text(
            """
            INSERT INTO users (id, name, email, phone, password_hash, must_reset_password,
                               role, is_active, email_verified, onboarded)
            VALUES (:id, :n, :e, :p, :pw, true, 'marketing_agent', true, false, true)
            """
        ), {"id": new_uid, "n": body.name, "e": body.email, "p": body.phone,
            "pw": _hash_password(temp_password)})
        user_row = (await sess.execute(
            text("SELECT id, name, email, role FROM users WHERE id = :u"), {"u": new_uid}
        )).mappings().first()

    # Uniqueness check
    exists = await _load_agent_by_user(sess, user_row["id"])
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "This user is already a network agent")

    # Validate manager reference (must be an existing manager-tier agent)
    manager_id = None
    if body.manager_id:
        mgr = (await sess.execute(
            text("SELECT id, tier FROM marketing_agents WHERE id = :m"), {"m": body.manager_id}
        )).mappings().first()
        if not mgr:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Manager not found")
        if mgr["tier"] != "manager":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "manager_id must reference a manager-tier agent")
        manager_id = str(mgr["id"])

    code = (body.agent_code or _generate_agent_code(user_row.get("name")))
    code = code.upper().replace(" ", "")

    # Ensure code uniqueness (retry loop, tiny)
    for _ in range(5):
        clash = (await sess.execute(
            text("SELECT 1 FROM marketing_agents WHERE agent_code = :c"), {"c": code}
        )).scalar_one_or_none()
        if not clash:
            break
        code = _generate_agent_code(user_row.get("name"))
    else:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate unique agent code")

    new_agent_id = str(uuid.uuid4())
    await sess.execute(text(
        """
        INSERT INTO marketing_agents
          (id, user_id, agent_code, tier, manager_id, commission_rate, override_rate,
           payout_method, payout_details, notes)
        VALUES (:id, :u, :c, :tier, :mgr, :r, :orr, :pm, :pd, :n)
        """
    ), {
        "id": new_agent_id,
        "u": user_row["id"],
        "c": code,
        "tier": body.tier,
        "mgr": manager_id,
        "r": body.commission_rate,
        "orr": body.override_rate,
        "pm": body.payout_method,
        "pd": _dumps(body.payout_details or {}),
        "n": body.notes,
    })
    row = (await sess.execute(
        text("SELECT * FROM marketing_agents WHERE id = :id"), {"id": new_agent_id}
    )).mappings().first()

    # Promote the user's role to marketing_agent (unless they're already admin+)
    if user_row["role"] not in ("admin", "super_admin", "marketing_agent"):
        await sess.execute(text(
            "UPDATE users SET role = 'marketing_agent' WHERE id = :u"
        ), {"u": user_row["id"]})

    await sess.commit()

    # Dispatch temporary credentials for freshly provisioned accounts.
    if temp_password and user_row.get("email"):
        await bus.publish("user.onboarded", {
            "user_id": str(user_row["id"]),
            "email": user_row["email"],
            "name": user_row.get("name") or "there",
            "role": "network manager" if body.tier == "manager" else "network agent",
            "school_name": "the ElimuAI Network",
            "temp_password": temp_password,
        })

    return {"agent": _serialize_agent(dict(row))}


@router.patch("/{agent_id}", dependencies=[AdminOnly])
async def update_agent(agent_id: uuid.UUID, body: AgentUpdateIn, sess: AsyncSession = Depends(get_session)):
    updates: dict = {}
    if body.commission_rate is not None:
        updates["commission_rate"] = body.commission_rate
    if body.override_rate is not None:
        updates["override_rate"] = body.override_rate
    if body.manager_id is not None:
        updates["manager_id"] = str(body.manager_id)
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
    q = f"UPDATE marketing_agents SET {set_clause}, updated_at = NOW() WHERE id = :id"
    await sess.execute(text(q), {**updates, "id": agent_id})
    row = (await sess.execute(
        text("SELECT * FROM marketing_agents WHERE id = :id"), {"id": agent_id}
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    await sess.commit()
    return {"agent": _serialize_agent(dict(row))}


@router.get("/{agent_id}", dependencies=[AdminOnly])
async def get_agent(agent_id: uuid.UUID, sess: AsyncSession = Depends(get_session)):
    row = (await sess.execute(text(
        """
        SELECT ma.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
        FROM marketing_agents ma JOIN users u ON u.id = ma.user_id
        WHERE ma.id = :id
        """
    ), {"id": agent_id})).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    return {"agent": dict(row)}


@router.get("/commissions/all", dependencies=[AdminOnly])
async def list_all_commissions(
    sess: AsyncSession = Depends(get_session),
    status_: str | None = Query(default=None, alias="status"),
    agent_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(200, ge=1, le=1000),
):
    q = [
        "SELECT c.*, ma.agent_code, ma.user_id AS agent_user_id,",
        "  au.name AS agent_name, au.email AS agent_email,",
        "  u.name AS user_name, u.email AS user_email",
        "FROM agent_commissions c",
        "JOIN marketing_agents ma ON ma.id = c.agent_id",
        "JOIN users au ON au.id = ma.user_id",
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
    return {"commissions": [dict(r) for r in rows]}


@router.post("/commissions/{commission_id}/pay", dependencies=[AdminOnly])
async def mark_commission_paid(
    commission_id: uuid.UUID,
    body: CommissionPayIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    upd = await sess.execute(text(
        """
        UPDATE agent_commissions
           SET status = 'paid',
               paid_at = NOW(),
               paid_by = :who,
               payout_reference = :ref,
               notes = COALESCE(:notes, notes)
         WHERE id = :id AND status = 'pending'
        """
    ), {"id": commission_id, "who": uuid.UUID(principal.user_id),
        "ref": body.payout_reference, "notes": body.notes})
    if upd.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found or already paid")
    row = (await sess.execute(
        text("SELECT * FROM agent_commissions WHERE id = :id"), {"id": commission_id}
    )).mappings().first()
    await sess.commit()
    return {"commission": dict(row)}


@router.post("/commissions/{commission_id}/void", dependencies=[AdminOnly])
async def void_commission(
    commission_id: uuid.UUID,
    body: CommissionPayIn,
    sess: AsyncSession = Depends(get_session),
):
    upd = await sess.execute(text(
        """
        UPDATE agent_commissions
           SET status = 'void',
               notes = COALESCE(:notes, notes)
         WHERE id = :id AND status = 'pending'
        """
    ), {"id": commission_id, "notes": body.notes})
    if upd.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found or not pending")
    row = (await sess.execute(
        text("SELECT * FROM agent_commissions WHERE id = :id"), {"id": commission_id}
    )).mappings().first()
    await sess.commit()
    return {"commission": dict(row)}


# ─── Serialization helpers ───────────────────────────────────────────────────


def _serialize_agent(row: dict) -> dict:
    """Normalize a marketing_agents row for JSON output."""
    out = dict(row)
    for k in ("id", "user_id", "manager_id"):
        if k in out and out[k] is not None:
            out[k] = str(out[k])
    for k in ("commission_rate", "override_rate", "commission_amount", "base_amount"):
        if k in out and isinstance(out[k], Decimal):
            out[k] = float(out[k])
    for k in ("created_at", "updated_at", "paid_at"):
        if k in out and isinstance(out[k], datetime):
            out[k] = out[k].isoformat()
    return out


def _dumps(value: dict) -> str:
    import json
    return json.dumps(value)
