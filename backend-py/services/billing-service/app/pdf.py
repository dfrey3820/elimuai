"""PDF invoice generator using reportlab."""
from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .models import Invoice


def generate_invoice_pdf(inv: Invoice, user_name: str) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # Header
    c.setFillColor(HexColor("#1a5f2a"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 60, "ElimuAI")
    c.setFillColor(HexColor("#999999"))
    c.setFont("Helvetica", 9)
    c.drawString(50, height - 78, "ELIMU · UJUZI · MAFANIKIO")
    c.setFillColor(HexColor("#666666"))
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 92, "AI-powered learning for East Africa")

    # Invoice title
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(width - 50, height - 60, "INVOICE")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#666666"))
    c.drawRightString(width - 50, height - 78, f"#{inv.invoice_number}")
    c.drawRightString(width - 50, height - 92, f"Date: {inv.created_at.strftime('%d %b %Y') if inv.created_at else ''}")

    status_color = HexColor("#1a5f2a") if inv.status == "paid" else HexColor("#e65100")
    c.setFillColor(status_color)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 50, height - 108, inv.status.upper())

    # Divider
    c.setStrokeColor(HexColor("#e0e0e0"))
    c.line(50, height - 135, width - 50, height - 135)

    # Bill to
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 155, "Bill To:")
    c.setFillColor(HexColor("#666666"))
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 170, user_name or "Customer")

    # Table header
    y = height - 215
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "DESCRIPTION")
    c.drawString(250, y, "PERIOD")
    c.drawString(400, y, "CYCLE")
    c.drawRightString(width - 50, y, "AMOUNT")

    c.setStrokeColor(HexColor("#e0e0e0"))
    c.line(50, y - 5, width - 50, y - 5)

    # Row
    y -= 22
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica", 10)
    plan_name = (inv.plan or "").capitalize() + " Plan"
    c.drawString(50, y, plan_name)
    c.setFillColor(HexColor("#666666"))
    period_str = f"{inv.period_start:%d/%m/%y} - {inv.period_end:%d/%m/%y}"
    c.drawString(250, y, period_str)
    cycle_name = (inv.billing_cycle or "monthly").replace("_", " ").title()
    c.drawString(400, y, cycle_name)
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 10)
    subtotal_val = Decimal(inv.subtotal) if inv.subtotal is not None else Decimal(inv.amount)
    c.drawRightString(width - 50, y, f"{inv.currency} {subtotal_val:,.0f}")

    y -= 30
    coupon_disc = Decimal(inv.coupon_discount or 0)
    if coupon_disc > 0:
        c.line(350, y, width - 50, y)
        y -= 12
        c.setFillColor(HexColor("#666666"))
        c.setFont("Helvetica", 10)
        c.drawString(350, y, "Subtotal:")
        c.drawRightString(width - 50, y, f"{inv.currency} {subtotal_val:,.0f}")
        y -= 15
        c.setFillColor(HexColor("#e65100"))
        c.drawString(350, y, f"Coupon ({inv.coupon_code or 'DISCOUNT'}):")
        c.drawRightString(width - 50, y, f"-{inv.currency} {coupon_disc:,.0f}")
        y -= 15

    # Total
    c.setStrokeColor(HexColor("#e0e0e0"))
    c.line(350, y, width - 50, y)
    y -= 18
    c.setFillColor(HexColor("#1a5f2a"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, "TOTAL:")
    c.drawRightString(width - 50, y, f"{inv.currency} {Decimal(inv.amount):,.0f}")

    # Footer
    c.setFillColor(HexColor("#999999"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 90, "Thank you for using ElimuAI. This invoice was generated automatically.")
    c.drawCentredString(width / 2, 75, "Questions? Contact support@elimuai.africa")

    c.showPage()
    c.save()
    return buf.getvalue()
