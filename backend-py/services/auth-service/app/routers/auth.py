"""Public auth endpoints: register, verify-otp, resend-otp, login, refresh,
logout, me, sessions, change-password, delete-account.

Ports the semantics of backend/src/routes/auth.js.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import Principal, decode_jwt
from elimu_common.events import EventBus

from app.deps import current_principal, get_event_bus, get_session, settings
from app.models import RefreshToken, School, User, UserSession
from app.notifications import emit_user_registered, send_otp_email
from app.otp import send_otp, verify_otp
from app.schemas import (
    ChangePasswordIn,
    DeleteAccountIn,
    LoginIn,
    LoginOtpChallengeOut,
    LogoutIn,
    RefreshIn,
    RefreshOut,
    RegisterIn,
    RegisterOut,
    ResendOtpIn,
    SessionOut,
    TokenPairOut,
    UserOut,
    VerifyOtpIn,
)
from app.security import generate_tokens, hash_password, verify_password

log = structlog.get_logger("auth-service")
router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _dispatch_email(bus: EventBus | None, email: str, code: str, purpose: str) -> bool:
    return await send_otp_email(bus, email, code, purpose)


async def _issue_tokens_and_session(
    session: AsyncSession, user: User, request: Request
) -> tuple[str, str]:
    access, refresh, jti = generate_tokens(
        user.id, user.role,
        secret=settings.jwt_secret,
        access_ttl_min=settings.jwt_access_ttl_min,
        refresh_ttl_min=settings.jwt_refresh_ttl_min,
    )
    now = datetime.utcnow()
    refresh_expires = now + timedelta(minutes=settings.jwt_refresh_ttl_min)

    session.add(RefreshToken(user_id=user.id, token=refresh, expires_at=refresh_expires))
    session.add(
        UserSession(
            user_id=user.id,
            token_jti=jti,
            ip_address=(request.client.host if request.client else None),
            user_agent=request.headers.get("user-agent"),
            expires_at=refresh_expires,
        )
    )
    await session.commit()
    return access, refresh


# ─── POST /register ──────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterOut, response_model_by_alias=True, status_code=201)
async def register(
    body: RegisterIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
    bus: EventBus | None = Depends(get_event_bus),
):
    # ─── Admin signup guard (see backend QA fix #3) ─────────────────────────
    if body.role == "admin":
        if not body.school_name or not body.school_name.strip():
            raise HTTPException(400, "school_name is required when registering as a school admin.")
        required = settings.school_signup_token
        if required:
            if not body.signup_token or body.signup_token != required:
                log.warning("admin_signup_blocked", email=body.email, ip=request.client.host if request.client else None)
                raise HTTPException(403, "A valid school signup token is required to register as a school admin.")
        else:
            log.warning("admin_signup_unrestricted", email=body.email, ip=request.client.host if request.client else None)

    # ─── Existing account handling ──────────────────────────────────────────
    existing = await session.scalar(select(User).where(User.email == body.email))
    if existing and existing.email_verified:
        raise HTTPException(409, "Email already registered")
    if existing and not existing.email_verified:
        # Allow re-registration by deleting the unverified stub.
        await session.execute(delete(User).where(User.id == existing.id))
        await session.commit()

    # ─── Optionally create school for admin signup ──────────────────────────
    assigned_school_id = body.school_id
    if body.role == "admin" and body.school_name:
        school = School(
            name=body.school_name.strip(),
            country=body.country,
            curriculum=body.curriculum or "CBC",
            email=body.email,
            phone=body.phone,
            plan="free",
            plan_expires=datetime.utcnow() + timedelta(days=settings.trial_days),
        )
        session.add(school)
        await session.flush()
        assigned_school_id = school.id

    # ─── Insert user (inactive) ─────────────────────────────────────────────
    user = User(
        name=body.name,
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
        country=body.country,
        language=body.language,
        grade_level=body.grade_level,
        school_id=assigned_school_id,
        curriculum=body.curriculum or "CBC",
        trial_expires=datetime.utcnow() + timedelta(days=settings.trial_days),
        is_active=False,
        email_verified=False,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(409, "Email or phone already registered") from exc

    await session.refresh(user)

    # ─── Send OTP ───────────────────────────────────────────────────────────
    async def _dispatcher(email: str, code: str, purpose: str) -> bool:
        return await _dispatch_email(bus, email, code, purpose)

    otp_result = await send_otp(
        session,
        email=body.email,
        purpose="signup",
        user_id=user.id,
        expiry_min=settings.otp_expiry_min,
        max_attempts=settings.otp_max_attempts,
        cooldown_sec=settings.otp_cooldown_sec,
        dispatch_email=_dispatcher,
        is_prod=(settings.env == "production"),
    )

    await emit_user_registered(bus, user_id=str(user.id), email=user.email or "", role=user.role)
    log.info("user.registered", user_id=str(user.id), role=user.role)

    return RegisterOut(
        user=UserOut.model_validate(user),
        otp_sent=otp_result.success,
        message=otp_result.message,
        dev_code=otp_result.dev_code,
    )


# ─── POST /verify-otp ────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp_endpoint(
    body: VerifyOtpIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    result = await verify_otp(session, email=body.email, code=body.code, purpose=body.purpose)
    if not result.valid:
        raise HTTPException(400, result.message)

    if body.purpose in ("signup", "login"):
        if body.purpose == "signup":
            await session.execute(
                update(User).where(User.email == body.email).values(is_active=True, email_verified=True)
            )
            await session.commit()

        user = await session.scalar(
            select(User).where(User.email == body.email).where(User.is_active.is_(True))
        )
        if user is None:
            raise HTTPException(404, "User not found")

        if body.purpose == "login":
            user.last_login = datetime.utcnow()
            await session.commit()

        access, refresh = await _issue_tokens_and_session(session, user, request)
        log.info("otp.verified", user_id=str(user.id), purpose=body.purpose)
        return TokenPairOut(
            user=UserOut.model_validate(user),
            access_token=access,
            refresh_token=refresh,
        ).model_dump(by_alias=True, mode="json")

    # Generic email verification
    await session.execute(update(User).where(User.email == body.email).values(email_verified=True))
    await session.commit()
    return {"verified": True, "message": "Email verified successfully."}


# ─── POST /resend-otp ────────────────────────────────────────────────────────

@router.post("/resend-otp")
async def resend_otp(
    body: ResendOtpIn,
    session: AsyncSession = Depends(get_session),
    bus: EventBus | None = Depends(get_event_bus),
):
    user = await session.scalar(select(User).where(User.email == body.email))
    result = await send_otp(
        session,
        email=body.email,
        purpose=body.purpose,
        user_id=(user.id if user else None),
        expiry_min=settings.otp_expiry_min,
        max_attempts=settings.otp_max_attempts,
        cooldown_sec=settings.otp_cooldown_sec,
        dispatch_email=lambda e, c, p: _dispatch_email(bus, e, c, p),
        is_prod=(settings.env == "production"),
    )
    return {"success": result.success, "message": result.message, "dev_code": result.dev_code}


# ─── POST /login ─────────────────────────────────────────────────────────────
# Step 1: verify credentials → send OTP (does NOT issue tokens directly)

@router.post("/login", response_model=LoginOtpChallengeOut, response_model_by_alias=True)
async def login(
    body: LoginIn,
    session: AsyncSession = Depends(get_session),
    bus: EventBus | None = Depends(get_event_bus),
):
    user = await session.scalar(
        select(User)
        .where(or_(User.email == body.identifier, User.phone == body.identifier))
        .where(User.is_active.is_(True))
    )
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    purpose = "signup" if not user.email_verified else "login"
    result = await send_otp(
        session,
        email=user.email or "",
        purpose=purpose,
        user_id=user.id,
        expiry_min=settings.otp_expiry_min,
        max_attempts=settings.otp_max_attempts,
        cooldown_sec=settings.otp_cooldown_sec,
        dispatch_email=lambda e, c, p: _dispatch_email(bus, e, c, p),
        is_prod=(settings.env == "production"),
    )
    return LoginOtpChallengeOut(
        purpose=purpose,  # type: ignore[arg-type]
        email=user.email or "",  # type: ignore[arg-type]
        user_name=user.name,
        message=result.message,
        dev_code=result.dev_code,
    )


# ─── POST /refresh ───────────────────────────────────────────────────────────

@router.post("/refresh", response_model=RefreshOut, response_model_by_alias=True)
async def refresh(
    body: RefreshIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    decoded = decode_jwt(body.refresh_token, settings.jwt_secret)
    rt = await session.scalar(
        select(RefreshToken)
        .where(RefreshToken.token == body.refresh_token)
        .where(RefreshToken.expires_at > datetime.utcnow())
    )
    if rt is None:
        raise HTTPException(401, "Invalid or expired refresh token")

    user_id = decoded.get("userId") or decoded.get("sub")
    old_jti = decoded.get("jti")
    if old_jti:
        await session.execute(
            update(UserSession).where(UserSession.token_jti == old_jti).values(is_revoked=True)
        )

    user = await session.scalar(select(User).where(User.id == user_id))
    access, new_refresh, jti = generate_tokens(
        user_id, user.role if user else None,
        secret=settings.jwt_secret,
        access_ttl_min=settings.jwt_access_ttl_min,
        refresh_ttl_min=settings.jwt_refresh_ttl_min,
    )
    now = datetime.utcnow()
    expires = now + timedelta(minutes=settings.jwt_refresh_ttl_min)

    await session.execute(delete(RefreshToken).where(RefreshToken.token == body.refresh_token))
    session.add(RefreshToken(user_id=user_id, token=new_refresh, expires_at=expires))
    session.add(
        UserSession(
            user_id=user_id,
            token_jti=jti,
            ip_address=(request.client.host if request.client else None),
            user_agent=request.headers.get("user-agent"),
            expires_at=expires,
        )
    )
    await session.commit()
    return RefreshOut(access_token=access, refresh_token=new_refresh)


# ─── POST /logout ────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(
    body: LogoutIn,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    if body.refresh_token:
        await session.execute(delete(RefreshToken).where(RefreshToken.token == body.refresh_token))
    if principal.jti:
        await session.execute(
            update(UserSession).where(UserSession.token_jti == principal.jti).values(is_revoked=True)
        )
    await session.commit()
    return {"message": "Logged out successfully"}


# ─── GET /me ─────────────────────────────────────────────────────────────────

@router.get("/me")
async def me(
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    user = await session.scalar(select(User).where(User.id == principal.user_id))
    if user is None:
        raise HTTPException(404, "User not found")
    return {"user": UserOut.model_validate(user)}


# ─── GET /sessions ───────────────────────────────────────────────────────────

@router.get("/sessions", response_model=dict)
async def list_sessions(
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    rows = (
        await session.execute(
            select(UserSession)
            .where(UserSession.user_id == principal.user_id)
            .where(UserSession.is_revoked.is_(False))
            .where(UserSession.expires_at > datetime.utcnow())
            .order_by(UserSession.last_active.desc())
        )
    ).scalars().all()

    out = []
    for s in rows:
        item = SessionOut(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            last_active=s.last_active,
            created_at=s.created_at,
            is_current=(s.token_jti == principal.jti),
        )
        out.append(item)
    return {"sessions": out}


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        update(UserSession)
        .where(UserSession.id == session_id)
        .where(UserSession.user_id == principal.user_id)
        .where(UserSession.is_revoked.is_(False))
        .values(is_revoked=True)
    )
    if result.rowcount == 0:
        raise HTTPException(404, "Session not found")
    await session.commit()
    return {"message": "Session revoked"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    await session.execute(
        update(UserSession)
        .where(UserSession.user_id == principal.user_id)
        .where(UserSession.token_jti != (principal.jti or ""))
        .values(is_revoked=True)
    )
    await session.execute(delete(RefreshToken).where(RefreshToken.user_id == principal.user_id))
    await session.commit()
    return {"message": "All other sessions revoked"}


# ─── POST /change-password ───────────────────────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordIn,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    user = await session.scalar(select(User).where(User.id == principal.user_id))
    if user is None:
        raise HTTPException(404, "User not found")
    if not user.password_hash or not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    user.updated_at = datetime.utcnow()
    await session.commit()
    return {"message": "Password changed successfully"}


# ─── DELETE /account ─────────────────────────────────────────────────────────

@router.delete("/account")
async def delete_account(
    body: DeleteAccountIn,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    user = await session.scalar(select(User).where(User.id == principal.user_id))
    if user is None:
        raise HTTPException(404, "User not found")
    if user.role == "super_admin":
        raise HTTPException(403, "Super admin accounts cannot be self-deleted")
    if not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect password")

    await session.execute(
        update(UserSession).where(UserSession.user_id == principal.user_id).values(is_revoked=True)
    )
    await session.execute(delete(RefreshToken).where(RefreshToken.user_id == principal.user_id))

    user.is_active = False
    user.name = "Deleted User"
    user.email = f"deleted_{user.id}@removed.local"
    user.phone = None
    user.updated_at = datetime.utcnow()
    await session.commit()
    log.info("user.self_deleted", user_id=str(user.id))
    return {"message": "Account deleted successfully"}
