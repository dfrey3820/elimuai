"""notifications-service worker — consumes Redis Streams events and dispatches
notifications (email + SMS).

Email providers (auto-selected in this priority order):
  1. Resend        (free tier: 3,000/month, 100/day — set RESEND_API_KEY)
  2. Brevo         (free tier: 300/day forever   — set BREVO_API_KEY)
  3. Mailtrap Send (free tier: 1,000/month       — set MAILTRAP_API_TOKEN + MAILTRAP_INBOX_ID for sandbox,
                                                    or MAILTRAP_API_TOKEN alone for the live send API)
  4. SMTP          (any provider — set SMTP_HOST/USER/PASS)
  5. Stub          (logs the payload; used in dev when nothing is configured)

SMS provider: Africa's Talking (set AT_API_KEY).

Consumes topics:
  * user.registered       → welcome email
  * user.onboarded        → invite email with temp password
  * otp.requested         → email OTP code
  * payment.completed     → payment confirmation email + SMS
  * invoice.issued        → invoice email
"""
from __future__ import annotations

import asyncio
import contextlib
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any

import httpx
import structlog

from elimu_common.config import BaseServiceSettings, get_settings
from elimu_common.events import EventBus
from elimu_common.logger import configure_logging


class Settings(BaseServiceSettings):
    service_name: str = "notifications-service"

    # ─── Email — free-tier HTTP APIs (preferred) ──────────────────────────
    # Resend — https://resend.com  (100/day, 3k/mo, no CC required)
    resend_api_key: str = ""
    # Brevo — https://brevo.com    (300/day forever, no CC required)
    brevo_api_key: str = ""
    # Mailtrap — https://mailtrap.io (sandbox for testing, or live send)
    mailtrap_api_url: str = "https://send.api.mailtrap.io"
    mailtrap_api_token: str = ""
    mailtrap_inbox_id: str = ""  # only for sandbox
    # SMTP fallback (any provider)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from_name: str = "ElimuAI"
    smtp_from_email: str = "noreply@elimuai.africa"

    # ─── SMS — Africa's Talking ───────────────────────────────────────────
    at_api_key: str = ""
    at_username: str = "sandbox"
    at_sender_id: str = ""


log = structlog.get_logger(__name__)


TOPICS = (
    "user.registered",
    "user.onboarded",
    "otp.requested",
    "payment.completed",
    "invoice.issued",
    "billing.reminder_free",
    "billing.reminder_expiring",
    "billing.reminder_renewal",
)


# ─── Email dispatchers ──────────────────────────────────────────────────────
async def _send_via_resend(settings: Settings, to: str, subject: str, html: str) -> bool:
    """https://resend.com/docs/api-reference/emails/send-email"""
    from_addr = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    payload = {"from": from_addr, "to": [to], "subject": subject, "html": html}
    headers = {"Authorization": f"Bearer {settings.resend_api_key}",
               "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
        if r.status_code >= 400:
            log.error("email.resend.failed", to=to, status=r.status_code, body=r.text[:400])
            return False
        # Log the Resend email id so we can trace delivery in the Resend dashboard.
        email_id = None
        try:
            email_id = (r.json() or {}).get("id")
        except Exception:  # noqa: BLE001
            pass
        log.info("email.sent", provider="resend", to=to, subject=subject, resend_id=email_id)
        return True


async def _send_via_brevo(settings: Settings, to: str, subject: str, html: str) -> bool:
    """https://developers.brevo.com/reference/sendtransacemail"""
    payload = {
        "sender": {"name": settings.smtp_from_name, "email": settings.smtp_from_email},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
    }
    headers = {"api-key": settings.brevo_api_key,
               "accept": "application/json",
               "content-type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
        if r.status_code >= 400:
            log.error("email.brevo.failed", to=to, status=r.status_code, body=r.text[:400])
            return False
        log.info("email.sent", provider="brevo", to=to, subject=subject)
        return True


async def _send_via_mailtrap(settings: Settings, to: str, subject: str, html: str) -> bool:
    """https://api-docs.mailtrap.io/docs/mailtrap-api-docs/  (works for both live send + sandbox)."""
    base = settings.mailtrap_api_url.rstrip("/")
    # Sandbox path includes inbox id; live send does not.
    if settings.mailtrap_inbox_id and "sandbox" in base:
        url = f"{base}/api/send/{settings.mailtrap_inbox_id}"
    else:
        url = f"{base}/api/send"
    payload = {
        "from": {"email": settings.smtp_from_email, "name": settings.smtp_from_name},
        "to": [{"email": to}],
        "subject": subject,
        "html": html,
    }
    headers = {"Authorization": f"Bearer {settings.mailtrap_api_token}",
               "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(url, json=payload, headers=headers)
        if r.status_code >= 400:
            log.error("email.mailtrap.failed", to=to, status=r.status_code, body=r.text[:400])
            return False
        log.info("email.sent", provider="mailtrap", to=to, subject=subject)
        return True


def _send_via_smtp_sync(settings: Settings, to: str, subject: str, html: str) -> bool:
    msg = EmailMessage()
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content("This email requires an HTML-capable client.")
    msg.add_alternative(html, subtype="html")
    ctx = ssl.create_default_context()
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.starttls(context=ctx)
        smtp.login(settings.smtp_user, settings.smtp_pass)
        smtp.send_message(msg)
    log.info("email.sent", provider="smtp", to=to, subject=subject)
    return True


async def send_email(settings: Settings, to: str, subject: str, html: str) -> bool:
    """Try providers in preference order; return True on first success."""
    try:
        if settings.resend_api_key:
            return await _send_via_resend(settings, to, subject, html)
        if settings.brevo_api_key:
            return await _send_via_brevo(settings, to, subject, html)
        if settings.mailtrap_api_token:
            return await _send_via_mailtrap(settings, to, subject, html)
        if settings.smtp_host and settings.smtp_user:
            return await asyncio.to_thread(_send_via_smtp_sync, settings, to, subject, html)
    except Exception as exc:  # noqa: BLE001
        log.error("email.failed", to=to, subject=subject, error=str(exc))
        return False
    log.info("email.stub", to=to, subject=subject)
    return False


async def send_sms(settings: Settings, phone: str, message: str) -> bool:
    if not settings.at_api_key:
        log.info("sms.stub", phone=phone, message=message)
        return False
    url = "https://api.africastalking.com/version1/messaging"
    if settings.at_username == "sandbox":
        url = "https://api.sandbox.africastalking.com/version1/messaging"
    data = {"username": settings.at_username, "to": phone, "message": message}
    if settings.at_sender_id:
        data["from"] = settings.at_sender_id
    headers = {"apiKey": settings.at_api_key, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, data=data, headers=headers)
            r.raise_for_status()
            log.info("sms.sent", phone=phone)
            return True
    except Exception as exc:  # noqa: BLE001
        log.error("sms.failed", phone=phone, error=str(exc))
        return False


# ─── Templates ──────────────────────────────────────────────────────────────
def _otp_html(code: str, purpose: str) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#2563EB">ElimuAI verification</h1>
      <p>Your verification code for <strong>{purpose}</strong> is:</p>
      <p style="font-size:32px;letter-spacing:6px;font-family:monospace;
                background:#f1f5f9;padding:16px;text-align:center;border-radius:8px">{code}</p>
      <p style="color:#64748b;font-size:12px">Expires in 10 minutes. If you didn't request this, ignore.</p>
    </div>
    """


def _welcome_html(name: str) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="color:#10B981">Welcome to ElimuAI, {name}!</h1>
      <p>Your account is ready. Start learning with AI-powered tutors, past papers, and progress tracking.</p>
    </div>
    """


def _invite_html(*, name: str, role: str, email: str, temp_password: str, school_name: str) -> str:
    color = "#2563EB" if role == "teacher" else "#10B981"
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:{color}">Welcome to ElimuAI, {name}!</h1>
      <p>You've been added as a <strong>{role.title()}</strong> at <strong>{school_name}</strong>.</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Password:</strong> <code style="color:{color}">{temp_password}</code></p>
      </div>
      <p style="color:#64748b;font-size:12px">Please change your password after your first login.</p>
    </div>
    """


def _payment_confirmation_html(payload: dict) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="color:#10B981">Payment received 🎉</h1>
      <p>Amount: <strong>{payload.get('currency', 'KES')} {payload.get('amount')}</strong></p>
      <p>Reference: <code>{payload.get('mpesa_receipt') or payload.get('reference')}</code></p>
      <p>Your <strong>{payload.get('plan')}</strong> plan is now active.</p>
    </div>
    """


def _reminder_free_html(*, name: str, school_name: str) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:#2563EB">Unlock the full ElimuAI experience, {name}</h1>
      <p>{school_name} is still on the <strong>Free</strong> plan. Start a subscription to give
         your teachers and students access to unlimited AI tutoring, past-paper drills, and full
         progress analytics.</p>
      <p style="margin:24px 0">
        <a href="https://elimuai.africa/dashboard?tab=Billing"
           style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:10px;
                  text-decoration:none;font-weight:700">Start subscription</a>
      </p>
      <p style="color:#64748b;font-size:12px">
        You're receiving this because you're an administrator on ElimuAI. We'll only nudge you once
        per week until you subscribe.
      </p>
    </div>
    """


def _reminder_expiring_html(*, name: str, school_name: str, plan: str, plan_expires: str | None, days_left: int | None) -> str:
    when = plan_expires.split("T")[0] if plan_expires else "soon"
    days_txt = f"in <strong>{days_left} day{'s' if (days_left or 0) != 1 else ''}</strong>" if days_left is not None else f"on <strong>{when}</strong>"
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:#F59E0B">Your ElimuAI subscription expires {days_txt}</h1>
      <p>Hi {name}, your <strong>{plan.title()}</strong> plan for <strong>{school_name}</strong>
         is due to expire on <strong>{when}</strong>.</p>
      <p>Renew now to avoid interruption to your teachers and students.</p>
      <p style="margin:24px 0">
        <a href="https://elimuai.africa/dashboard?tab=Billing"
           style="background:#F59E0B;color:#fff;padding:12px 20px;border-radius:10px;
                  text-decoration:none;font-weight:700">Renew subscription</a>
      </p>
      <p style="color:#64748b;font-size:12px">You will receive one reminder per expiry date.</p>
    </div>
    """


def _reminder_renewal_html(*, name: str, plan: str, plan_expires: str | None,
                           invoice_number: str, amount: str, currency: str,
                           billing_cycle: str, renew_link: str | None) -> str:
    when = plan_expires.split("T")[0] if plan_expires else "recently"
    cycle_txt = billing_cycle.replace("_", "-")
    pay_href = renew_link or "https://elimuai.africa/dashboard?tab=Billing"
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:#EF4444">Your ElimuAI subscription has expired</h1>
      <p>Hi {name}, your <strong>{plan.title()}</strong> plan expired on <strong>{when}</strong>
         and AI tutoring, past papers and progress analytics are now paused.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">Renewal invoice</p>
        <p style="margin:0;font-size:15px"><strong>{invoice_number}</strong></p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:800">{currency} {amount}</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:12px">{plan.title()} plan · {cycle_txt} billing</p>
      </div>
      <p style="margin:24px 0">
        <a href="{pay_href}"
           style="background:#EF4444;color:#fff;padding:12px 20px;border-radius:10px;
                  text-decoration:none;font-weight:700">Pay with M-Pesa</a>
      </p>
      <p style="color:#64748b;font-size:12px">
        The button sends an M-Pesa prompt straight to your registered phone — just enter your PIN.
        We'll send at most three reminders for this invoice. If you've already renewed,
        you can ignore this email.
      </p>
    </div>
    """


# ─── Event router ───────────────────────────────────────────────────────────
async def handle(settings: Settings, topic: str, payload: dict[str, Any]) -> None:
    if not payload:
        log.warning("empty_payload", topic=topic)
        return

    if topic == "otp.requested":
        email = payload.get("email")
        code = payload.get("code")
        purpose = payload.get("purpose", "verification")
        if email and code:
            await send_email(settings, email, f"Your ElimuAI code: {code}", _otp_html(code, purpose))

    elif topic == "user.registered":
        email = payload.get("email")
        name = payload.get("name") or "friend"
        if email:
            await send_email(settings, email, "Welcome to ElimuAI", _welcome_html(name))

    elif topic == "user.onboarded":
        email = payload.get("email")
        if email:
            await send_email(
                settings, email,
                f"You've been added to {payload.get('school_name', 'ElimuAI')}",
                _invite_html(
                    name=payload.get("name") or "friend",
                    role=payload.get("role", "student"),
                    email=email,
                    temp_password=payload.get("temp_password", ""),
                    school_name=payload.get("school_name", "ElimuAI"),
                ),
            )

    elif topic == "payment.completed":
        email = payload.get("email")
        phone = payload.get("phone")
        if email:
            await send_email(settings, email, "Payment received — ElimuAI", _payment_confirmation_html(payload))
        if phone:
            amt = payload.get("amount")
            await send_sms(settings, phone, f"ElimuAI: KES {amt} received. Your {payload.get('plan')} plan is active.")

    elif topic == "invoice.issued":
        email = payload.get("email")
        if email:
            await send_email(
                settings, email,
                f"Invoice {payload.get('invoice_number')} — ElimuAI",
                f"<p>Your invoice <strong>{payload.get('invoice_number')}</strong> is ready. "
                f"Download from your dashboard.</p>",
            )

    elif topic == "billing.reminder_free":
        email = payload.get("email")
        if email:
            await send_email(
                settings, email,
                "Start your ElimuAI subscription",
                _reminder_free_html(
                    name=payload.get("name") or "there",
                    school_name=payload.get("school_name") or "your school",
                ),
            )

    elif topic == "billing.reminder_expiring":
        email = payload.get("email")
        if email:
            days_left = payload.get("days_left")
            subject = (
                f"Your ElimuAI subscription expires in {days_left} day"
                f"{'s' if (days_left or 0) != 1 else ''}"
                if isinstance(days_left, int)
                else "Your ElimuAI subscription is expiring soon"
            )
            await send_email(
                settings, email, subject,
                _reminder_expiring_html(
                    name=payload.get("name") or "there",
                    school_name=payload.get("school_name") or "your school",
                    plan=payload.get("plan") or "school",
                    plan_expires=payload.get("plan_expires"),
                    days_left=days_left if isinstance(days_left, int) else None,
                ),
            )

    elif topic == "billing.reminder_renewal":
        email = payload.get("email")
        if email:
            await send_email(
                settings, email,
                f"Renewal invoice {payload.get('invoice_number')} — your ElimuAI plan has expired",
                _reminder_renewal_html(
                    name=payload.get("name") or "there",
                    plan=payload.get("plan") or "student",
                    plan_expires=payload.get("plan_expires"),
                    invoice_number=payload.get("invoice_number") or "",
                    amount=payload.get("amount") or "",
                    currency=payload.get("currency") or "KES",
                    billing_cycle=payload.get("billing_cycle") or "monthly",
                    renew_link=payload.get("renew_link"),
                ),
            )

    else:
        log.warning("unknown_topic", topic=topic)


async def main() -> None:
    settings = get_settings(Settings)  # type: ignore[arg-type]
    configure_logging(settings.service_name, settings.log_level)
    bus = EventBus(settings.redis_url)
    log.info("worker.startup", topics=list(TOPICS))
    try:
        async for topic, payload in bus.subscribe(settings.service_name, *TOPICS):
            with contextlib.suppress(Exception):
                await handle(settings, topic, payload or {})
    finally:
        await bus.close()


if __name__ == "__main__":
    asyncio.run(main())
