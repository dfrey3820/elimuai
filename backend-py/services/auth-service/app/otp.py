"""OTP send + verify. Emits an 'otp.requested' event that notifications-service consumes."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OtpToken

log = structlog.get_logger(__name__)

Purpose = Literal["signup", "login", "verify_email"]


def _generate_code() -> str:
    # 6-digit numeric, cryptographically random. matches Node otpService.js.
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


class OtpResult:
    def __init__(self, *, success: bool, message: str, dev_code: str | None = None) -> None:
        self.success = success
        self.message = message
        self.dev_code = dev_code


async def send_otp(
    session: AsyncSession,
    *,
    email: str,
    purpose: Purpose,
    user_id: UUID | None,
    expiry_min: int,
    max_attempts: int,
    cooldown_sec: int,
    dispatch_email,  # async callable(email, code, purpose) -> bool
    is_prod: bool,
) -> OtpResult:
    now = datetime.utcnow()

    # ─── Cooldown check ────────────────────────────────────────────────────
    cutoff = now - timedelta(seconds=cooldown_sec)
    recent = await session.scalar(
        select(OtpToken.id)
        .where(OtpToken.email == email)
        .where(OtpToken.purpose == purpose)
        .where(OtpToken.created_at > cutoff)
        .limit(1)
    )
    if recent is not None:
        return OtpResult(success=False, message="Please wait before requesting another code.")

    # ─── Invalidate previous unused OTPs for this email+purpose ────────────
    await session.execute(
        update(OtpToken)
        .where(OtpToken.email == email)
        .where(OtpToken.purpose == purpose)
        .where(OtpToken.verified.is_(False))
        .values(verified=True)
    )

    code = _generate_code()
    expires_at = now + timedelta(minutes=expiry_min)

    session.add(
        OtpToken(
            user_id=user_id,
            email=email,
            code=code,
            purpose=purpose,
            expires_at=expires_at,
            max_attempts=max_attempts,
        )
    )
    await session.commit()

    # ─── Dispatch (fire and forget; caller handles failure fallback) ────────
    try:
        sent = await dispatch_email(email, code, purpose)
    except Exception as exc:  # noqa: BLE001
        log.warning("otp.dispatch_error", error=str(exc), email=email)
        sent = False

    if not sent:
        if not is_prod:
            log.info("otp.dev_mode", email=email, code=code, purpose=purpose)
            return OtpResult(success=True, message="OTP sent (dev mode).", dev_code=code)
        return OtpResult(success=False, message="Failed to send verification email.")

    log.info("otp.sent", email=email, purpose=purpose)
    return OtpResult(success=True, message="Verification code sent to your email.")


class VerifyResult:
    def __init__(self, *, valid: bool, message: str = "", user_id: UUID | None = None) -> None:
        self.valid = valid
        self.message = message
        self.user_id = user_id


async def verify_otp(
    session: AsyncSession,
    *,
    email: str,
    code: str,
    purpose: Purpose,
) -> VerifyResult:
    otp = await session.scalar(
        select(OtpToken)
        .where(OtpToken.email == email)
        .where(OtpToken.purpose == purpose)
        .where(OtpToken.verified.is_(False))
        .order_by(OtpToken.created_at.desc())
        .limit(1)
    )
    if otp is None:
        return VerifyResult(valid=False, message="No pending verification code found. Please request a new one.")

    now = datetime.utcnow()
    # Postgres returns naive datetimes for our timestamp cols; compare naively too.
    expires_at = otp.expires_at.replace(tzinfo=None) if otp.expires_at.tzinfo else otp.expires_at
    if expires_at < now:
        otp.verified = True
        await session.commit()
        return VerifyResult(valid=False, message="Code has expired. Please request a new one.")

    if otp.attempts >= otp.max_attempts:
        otp.verified = True
        await session.commit()
        return VerifyResult(valid=False, message="Too many attempts. Please request a new code.")

    otp.attempts += 1
    if otp.code != code:
        await session.commit()
        remaining = otp.max_attempts - otp.attempts
        return VerifyResult(valid=False, message=f"Invalid code. {remaining} attempt(s) remaining.")

    otp.verified = True
    await session.commit()
    return VerifyResult(valid=True, user_id=otp.user_id)
