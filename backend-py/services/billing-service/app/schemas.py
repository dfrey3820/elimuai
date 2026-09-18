from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

CyclePriceDict = dict[str, "CyclePrice"]
Cycle = Literal["monthly", "quarterly", "semi_annual", "annual"]
Plan = Literal["student", "teacher", "parent", "school", "family", "enterprise"]


class CyclePrice(BaseModel):
    monthlyPrice: int
    months: int
    discount: int
    originalTotal: int
    total: int
    savings: int
    durationDays: int
    currency: str = "KES"


class SubscriptionInfoOut(BaseModel):
    trialDays: int
    plans: dict[str, dict]
    pricing: dict[str, dict[str, CyclePrice]]
    currency: str = "KES"
    billingEnabled: bool = True


class MpesaInitiateIn(BaseModel):
    plan: Plan
    phone: str = Field(..., pattern=r"^254\d{9}$", description="MSISDN 254XXXXXXXXX")
    billing_cycle: Cycle = "monthly"
    coupon_code: str | None = None
    # Optional CH6 Insurance-Agent Network referral code — the agent's unique
    # code from ``referral_codes``. When supplied and valid, the subsequent
    # payment success will auto-credit agent/manager/network-head commissions.
    agent_referral_code: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
        validation_alias=AliasChoices("agent_referral_code", "agentReferralCode", "agentCode", "agent_code", "ref"),
    )


class MpesaInitiateOut(BaseModel):
    success: bool
    paymentId: uuid.UUID
    jobId: str
    status: str
    couponApplied: str | None = None
    couponDiscount: float = 0
    finalAmount: float
    message: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    plan: str
    billing_cycle: str | None = None
    amount: Decimal
    currency: str
    method: str | None = None
    status: str
    mpesa_receipt: str | None = None
    phone_number: str | None = None
    reference: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    invoice_number: str
    plan: str
    billing_cycle: str
    amount: Decimal
    currency: str
    status: str
    period_start: date
    period_end: date
    due_date: date
    paid_at: datetime | None = None
    coupon_code: str | None = None
    coupon_discount: Decimal
    subtotal: Decimal | None = None
    created_at: datetime


class CouponValidateIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    plan: Plan | None = None
    billing_cycle: Cycle | None = None
    amount: float | None = None


class CouponInfo(BaseModel):
    id: uuid.UUID
    code: str
    type: str
    value: float
    description: str | None = None


class CouponValidateOut(BaseModel):
    valid: bool
    coupon: CouponInfo | None = None
    discount: float = 0
    finalAmount: float | None = None
    error: str | None = None
