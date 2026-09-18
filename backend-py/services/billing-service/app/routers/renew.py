"""One-click renewal payment links.

The renewal-reminder email carries a signed link to
``GET /api/payments/renew/{token}``. The token authenticates the request (no
JWT — the recipient may not be logged in), so the gateway exposes this prefix
publicly, mirroring the webhook carve-out.

GET renders a confirmation page (never side-effecting — mail scanners prefetch
links); the page's button POSTs the same token, which fires the M-Pesa STK
push to the subscriber's registered phone. Completion then flows through the
normal gateway webhook (plan activation + invoice paid).
"""
from __future__ import annotations

import hmac
import json
import time
import uuid
from decimal import Decimal
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_session, settings
from ..gateway_client import PaymentGatewayClient, PaymentGatewayError

router = APIRouter(prefix="/api/payments/renew", tags=["payments-renew"])

TOKEN_TTL_SECONDS = 30 * 86400  # links stay valid well past the reminder week


def _sign(invoice_id: str, exp: int) -> str:
    msg = f"renew:{invoice_id}:{exp}".encode()
    return hmac.new(settings.jwt_secret.encode(), msg, sha256).hexdigest()[:32]


def make_renew_token(invoice_id: str | uuid.UUID) -> str:
    exp = int(time.time()) + TOKEN_TTL_SECONDS
    return f"{invoice_id}.{exp}.{_sign(str(invoice_id), exp)}"


def _parse_token(token: str) -> str:
    try:
        invoice_id, exp_s, sig = token.split(".")
        exp = int(exp_s)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed renewal link")
    if not hmac.compare_digest(sig, _sign(invoice_id, exp)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid renewal link")
    if exp < time.time():
        raise HTTPException(status.HTTP_410_GONE, "This renewal link has expired")
    return invoice_id


def _page(title: str, body: str, color: str = "#7C3AED") -> HTMLResponse:
    return HTMLResponse(f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — ElimuAI</title></head>
<body style="font-family:'Segoe UI',sans-serif;background:#F8FAFC;margin:0;padding:32px 16px">
  <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:28px">
    <h2 style="color:{color};margin:0 0 12px">{title}</h2>
    {body}
    <p style="color:#94A3B8;font-size:12px;margin-top:24px">ElimuAI — AI-powered learning for East Africa</p>
  </div>
</body></html>""")


async def _load(sess: AsyncSession, invoice_id: str):
    row = (await sess.execute(text(
        """
        SELECT i.id, i.invoice_number, i.plan, i.billing_cycle, i.amount, i.currency,
               i.status, u.id AS user_id, u.name, u.phone
        FROM invoices i JOIN users u ON u.id = i.user_id
        WHERE i.id = CAST(:id AS uuid)
        """
    ), {"id": invoice_id})).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    return row


def _mask(phone: str | None) -> str:
    if not phone or len(phone) < 6:
        return "your registered number"
    return f"{phone[:6]}•••{phone[-2:]}"


@router.get("/{token}", response_class=HTMLResponse)
async def renew_confirm_page(token: str, sess: AsyncSession = Depends(get_session)):
    invoice_id = _parse_token(token)
    inv = await _load(sess, invoice_id)
    if inv["status"] == "paid":
        return _page("Already renewed 🎉", "<p>This invoice has been paid — your plan is active. Karibu!</p>", "#10B981")
    if not inv["phone"]:
        return _page("Phone number needed", (
            "<p>We don't have an M-Pesa number on your account. Please renew from your "
            '<a href="https://elimuai.africa/dashboard?tab=Billing">ElimuAI dashboard</a>.</p>'
        ), "#F59E0B")
    return _page("Renew your ElimuAI plan", f"""
      <p>Hi {inv['name'] or 'there'}, confirm to receive an M-Pesa prompt on
         <strong>{_mask(inv['phone'])}</strong>.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin:16px 0">
        <p style="margin:0;font-size:13px;color:#64748b">{inv['invoice_number']} · {str(inv['plan']).title()} · {str(inv['billing_cycle']).replace('_','-')}</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800">{inv['currency']} {inv['amount']}</p>
      </div>
      <form method="post" action="">
        <button type="submit" style="background:#7C3AED;color:#fff;border:none;padding:12px 20px;
                border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;width:100%">
          Send M-Pesa prompt
        </button>
      </form>
    """)


@router.post("/{token}", response_class=HTMLResponse)
async def renew_initiate(token: str, sess: AsyncSession = Depends(get_session)):
    invoice_id = _parse_token(token)
    inv = await _load(sess, invoice_id)
    if inv["status"] == "paid":
        return _page("Already renewed 🎉", "<p>This invoice has been paid — your plan is active.</p>", "#10B981")
    if not inv["phone"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No phone number on file")
    if not (settings.payment_gateway_url and settings.payment_gateway_api_key and settings.payment_gateway_api_secret):
        return _page("Temporarily unavailable", (
            "<p>Payments are temporarily unavailable. Please try again shortly or renew from your "
            '<a href="https://elimuai.africa/dashboard?tab=Billing">dashboard</a>.</p>'
        ), "#EF4444")

    reference = f"ELIMU-REN-{int(time.time() * 1000)}-{str(inv['user_id'])[:8].upper()}"
    await sess.execute(text(
        """
        INSERT INTO payments (user_id, plan, billing_cycle, amount, currency, method,
                              status, phone_number, reference, invoice_id, metadata)
        VALUES (:uid, :plan, :cycle, :amount, :currency, 'mpesa',
                'pending', :phone, :ref, CAST(:inv AS uuid), CAST(:meta AS jsonb))
        """
    ), {
        "uid": inv["user_id"], "plan": inv["plan"], "cycle": inv["billing_cycle"],
        "amount": inv["amount"], "currency": inv["currency"], "phone": inv["phone"],
        "ref": reference, "inv": invoice_id,
        "meta": json.dumps({"source": "renewal_link"}),
    })
    await sess.commit()

    gateway = PaymentGatewayClient(
        settings.payment_gateway_url,
        settings.payment_gateway_api_key,
        settings.payment_gateway_api_secret,
    )
    try:
        await gateway.stk_push(
            phone_number=inv["phone"],
            amount=float(Decimal(str(inv["amount"]))),
            reference=reference,
            description=f"ElimuAI {inv['plan']} plan renewal ({inv['invoice_number']})",
        )
    except PaymentGatewayError:
        await sess.execute(text(
            "UPDATE payments SET status = 'failed', "
            "metadata = COALESCE(metadata, '{}'::jsonb) || '{\"error\":\"gateway_error\"}'::jsonb "
            "WHERE reference = :ref"
        ), {"ref": reference})
        await sess.commit()
        return _page("Something went wrong", (
            "<p>We couldn't reach M-Pesa. Please try again in a few minutes or renew from your "
            '<a href="https://elimuai.africa/dashboard?tab=Billing">dashboard</a>.</p>'
        ), "#EF4444")

    return _page("Check your phone 📲", f"""
      <p>We've sent an M-Pesa prompt to <strong>{_mask(inv['phone'])}</strong>.</p>
      <p>Enter your PIN to pay <strong>{inv['currency']} {inv['amount']}</strong> and your
         <strong>{str(inv['plan']).title()}</strong> plan will be reactivated instantly.</p>
    """, "#10B981")
