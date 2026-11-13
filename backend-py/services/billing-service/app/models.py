"""Tables billing-service reads/writes."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy import Enum as PgEnum
from sqlalchemy import JSON as JSONB
from elimu_common.types import GUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


PlanType = PgEnum(
    "free", "student", "teacher", "parent", "family", "school", "enterprise",
    name="plan_type",
)
BillingCycle = PgEnum(
    "monthly", "quarterly", "semi_annual", "annual",
    name="billing_cycle",
)
PaymentStatus = PgEnum(
    "pending", "completed", "failed", "refunded",
    name="payment_status",
)
PaymentMethod = PgEnum(
    "mpesa", "airtel_money", "tkash", "card", "bank",
    name="payment_method",
)
InvoiceStatus = PgEnum(
    "draft", "pending", "paid", "overdue", "cancelled",
    name="invoice_status",
)
CouponType = PgEnum("fixed", "percentage", name="coupon_type")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    # user_id FK is enforced at the DB level (schema.sql); users table lives in users-service, not modeled here.
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    school_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    plan: Mapped[str] = mapped_column(PlanType, nullable=False)
    billing_cycle: Mapped[str] = mapped_column(BillingCycle, server_default="monthly")
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(5), server_default="KES")
    method: Mapped[str] = mapped_column(PaymentMethod, nullable=False)
    status: Mapped[str] = mapped_column(PaymentStatus, server_default="pending")
    mpesa_checkout_id: Mapped[str | None] = mapped_column(String(100))
    mpesa_receipt: Mapped[str | None] = mapped_column(String(100))
    phone_number: Mapped[str | None] = mapped_column(String(20))
    reference: Mapped[str | None] = mapped_column(String(100), unique=True)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    coupon_discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # user_id FK enforced at DB level; users table not modeled in this service.
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    plan: Mapped[str] = mapped_column(PlanType, nullable=False)
    billing_cycle: Mapped[str] = mapped_column(BillingCycle, nullable=False, server_default="monthly")
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(5), server_default="KES")
    status: Mapped[str] = mapped_column(InvoiceStatus, server_default="pending")
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    coupon_code: Mapped[str | None] = mapped_column(String(50))
    coupon_discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(CouponType, server_default="percentage")
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    max_discount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    applicable_plans: Mapped[list[str]] = mapped_column(JSONB, default=list)
    applicable_cycles: Mapped[list[str]] = mapped_column(JSONB, default=list)
    max_uses: Mapped[int | None] = mapped_column(Integer)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, server_default="1")
    times_used: Mapped[int] = mapped_column(Integer, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[uuid.UUID | None] = mapped_column(GUID())
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    coupon_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("coupons.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ─── Marketing agents ────────────────────────────────────────────────────────

CommissionStatus = PgEnum(
    "pending", "paid", "void",
    name="agent_commission_status",
)


class MarketingAgent(Base):
    __tablename__ = "marketing_agents"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False, unique=True)
    agent_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    commission_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), server_default="0.15")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    payout_method: Mapped[str | None] = mapped_column(String(32))
    payout_details: Mapped[dict] = mapped_column(JSONB, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AgentReferral(Base):
    __tablename__ = "agent_referrals"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("marketing_agents.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String(32), server_default="link")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AgentCommission(Base):
    __tablename__ = "agent_commissions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("marketing_agents.id"), nullable=False)
    referral_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("agent_referrals.id"), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    base_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    commission_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    commission_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(5), server_default="KES")
    status: Mapped[str] = mapped_column(String(24), server_default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    paid_by: Mapped[uuid.UUID | None] = mapped_column(GUID())
    payout_reference: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
