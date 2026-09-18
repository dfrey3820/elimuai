# ============================================================
# ElimuAI CH6 — Insurance Agent Network API
# app/routers/ch6_insurance_network.py
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from decimal import Decimal
import csv
import io
import uuid

from app.database import get_db
from app.services.ch6_commission_engine import calculate_ch6_commission

router = APIRouter()
BASE_URL = "https://elimuai.africa"


class CreateNetworkRequest(BaseModel):
    network_name: str
    head_full_name: str
    head_phone: str
    head_mpesa_number: str
    head_email: Optional[str] = None
    insurance_company: Optional[str] = None
    notes: Optional[str] = None


class CH6ConversionRequest(BaseModel):
    subscriber_id: str
    agent_referral_code: str
    plan: str
    payment_provider: str
    provider_txn_id: str
    subscription_month: int = 1
    is_first_conversion: bool = True


@router.post("/api/admin/ch6/networks")
async def create_network(payload: CreateNetworkRequest, db: AsyncSession = Depends(get_db)):
    """Create a new Insurance Agent Network and its head partner record."""
    head_id = str(uuid.uuid4())
    network_id = str(uuid.uuid4())

    await db.execute(text("""
        INSERT INTO partners
          (id, full_name, email, phone, mpesa_number, channel_type,
           insurance_company, notes, network_id)
        VALUES
          (:id, :name, :email, :phone, :mpesa, 'insurance_network_head',
           :company, :notes, :network_id)
    """), {
        "id": head_id, "name": payload.head_full_name, "email": payload.head_email,
        "phone": payload.head_phone, "mpesa": payload.head_mpesa_number,
        "company": payload.insurance_company, "notes": payload.notes,
        "network_id": network_id,
    })

    await db.execute(text("""
        INSERT INTO insurance_networks
          (id, network_name, head_partner_id, insurance_company, notes)
        VALUES
          (:id, :name, :head_id, :company, :notes)
    """), {
        "id": network_id, "name": payload.network_name, "head_id": head_id,
        "company": payload.insurance_company, "notes": payload.notes,
    })

    await db.commit()
    return {
        "network_id": network_id,
        "head_partner_id": head_id,
        "message": "Network created. Now bulk-import managers and agents using /api/admin/ch6/bulk-import",
    }


CSV_TEMPLATE = """full_name,phone,mpesa_number,email,role,employee_number,manager_employee_number,region,custom_code
Jane Wanjiru,+254712000001,+254712000001,jane.w@example.com,manager,MGR-001,,Nairobi,
John Otieno,+254712000002,+254712000002,john.o@example.com,agent,AGT-1001,MGR-001,Nairobi,
Mary Achieng,+254712000003,+254712000003,mary.a@example.com,agent,AGT-1002,MGR-001,Nairobi,
"""

@router.get("/api/admin/ch6/csv-template")
async def get_csv_template():
    """Returns a downloadable CSV template for the bulk import."""
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.StringIO(CSV_TEMPLATE),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ch6_agent_import_template.csv"}
    )


@router.post("/api/admin/ch6/bulk-import")
async def bulk_import_agents(network_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Bulk import managers and agents from CSV into a network.
    Pass 1: create 'manager' rows, link to network head.
    Pass 2: create 'agent' rows, link to their manager via employee_number.
    """
    net_result = await db.execute(
        text("SELECT id, head_partner_id FROM insurance_networks WHERE id = :id"),
        {"id": network_id}
    )
    network = net_result.fetchone()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    head_partner_id = str(network.head_partner_id)
    batch_id = str(uuid.uuid4())

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    rows = list(reader)

    if len(rows) > 2000:
        raise HTTPException(status_code=400, detail="Maximum 2000 rows per import")

    for i, row in enumerate(rows, start=1):
        await db.execute(text("""
            INSERT INTO ch6_bulk_import_staging
              (id, import_batch_id, row_number, full_name, phone, mpesa_number,
               email, role, manager_employee_number, employee_number,
               region, custom_code, status)
            VALUES
              (:id, :batch, :row, :name, :phone, :mpesa,
               :email, :role, :mgr_emp, :emp,
               :region, :code, 'pending')
        """), {
            "id": str(uuid.uuid4()), "batch": batch_id, "row": i,
            "name": row.get("full_name", "").strip(),
            "phone": row.get("phone", "").strip(),
            "mpesa": row.get("mpesa_number", "").strip() or row.get("phone", "").strip(),
            "email": row.get("email", "").strip() or None,
            "role": row.get("role", "").strip().lower(),
            "mgr_emp": row.get("manager_employee_number", "").strip() or None,
            "emp": row.get("employee_number", "").strip(),
            "region": row.get("region", "").strip() or None,
            "code": row.get("custom_code", "").strip() or None,
        })
    await db.commit()

    created = {"managers": 0, "agents": 0, "errors": 0}
    employee_to_partner = {}

    # PASS 1: Managers
    staged = await db.execute(text("""
        SELECT * FROM ch6_bulk_import_staging
        WHERE import_batch_id = :batch AND role = 'manager'
        ORDER BY row_number
    """), {"batch": batch_id})

    for row in staged.fetchall():
        try:
            if not row.full_name or not row.phone or not row.employee_number:
                raise ValueError("Missing required field (full_name, phone, or employee_number)")

            partner_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO partners
                  (id, full_name, email, phone, mpesa_number, channel_type,
                   region, employee_number, parent_partner_id, network_id,
                   team_code, insurance_company)
                VALUES
                  (:id, :name, :email, :phone, :mpesa, 'insurance_manager',
                   :region, :emp, :head_id, :network_id,
                   :team_code, (SELECT insurance_company FROM insurance_networks WHERE id = :network_id))
            """), {
                "id": partner_id, "name": row.full_name, "email": row.email,
                "phone": row.phone, "mpesa": row.mpesa_number,
                "region": row.region, "emp": row.employee_number,
                "head_id": head_partner_id, "network_id": network_id,
                "team_code": f"TEAM-{row.employee_number}",
            })

            code = row.custom_code or f"MGR-{row.full_name.upper().split()[0][:6]}-{str(uuid.uuid4())[:4].upper()}"
            await db.execute(text("""
                INSERT INTO referral_codes (id, partner_id, code, channel_type)
                VALUES (:id, :pid, :code, 'insurance_manager')
            """), {"id": str(uuid.uuid4()), "pid": partner_id, "code": code})

            employee_to_partner[row.employee_number] = partner_id
            await db.execute(text("""
                UPDATE ch6_bulk_import_staging SET status = 'created', partner_id = :pid WHERE id = :id
            """), {"pid": partner_id, "id": row.id})
            created["managers"] += 1

        except Exception as e:
            await db.execute(text("""
                UPDATE ch6_bulk_import_staging SET status = 'error', error_message = :err WHERE id = :id
            """), {"err": str(e), "id": row.id})
            created["errors"] += 1

    await db.commit()

    # PASS 2: Agents
    staged = await db.execute(text("""
        SELECT * FROM ch6_bulk_import_staging
        WHERE import_batch_id = :batch AND role = 'agent'
        ORDER BY row_number
    """), {"batch": batch_id})

    for row in staged.fetchall():
        try:
            if not row.full_name or not row.phone or not row.employee_number:
                raise ValueError("Missing required field (full_name, phone, or employee_number)")

            manager_partner_id = employee_to_partner.get(row.manager_employee_number)
            if not manager_partner_id:
                existing_mgr = await db.execute(
                    text("SELECT id FROM partners WHERE employee_number = :emp AND channel_type = 'insurance_manager'"),
                    {"emp": row.manager_employee_number}
                )
                mgr_row = existing_mgr.fetchone()
                manager_partner_id = str(mgr_row.id) if mgr_row else None

            if not manager_partner_id:
                raise ValueError(f"Manager with employee_number '{row.manager_employee_number}' not found")

            partner_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO partners
                  (id, full_name, email, phone, mpesa_number, channel_type,
                   region, employee_number, parent_partner_id, network_id,
                   insurance_company)
                VALUES
                  (:id, :name, :email, :phone, :mpesa, 'insurance_agent',
                   :region, :emp, :mgr_id, :network_id,
                   (SELECT insurance_company FROM insurance_networks WHERE id = :network_id))
            """), {
                "id": partner_id, "name": row.full_name, "email": row.email,
                "phone": row.phone, "mpesa": row.mpesa_number,
                "region": row.region, "emp": row.employee_number,
                "mgr_id": manager_partner_id, "network_id": network_id,
            })

            code = row.custom_code or f"AGT-{row.full_name.upper().split()[0][:6]}-{str(uuid.uuid4())[:4].upper()}"
            await db.execute(text("""
                INSERT INTO referral_codes (id, partner_id, code, channel_type)
                VALUES (:id, :pid, :code, 'insurance_agent')
            """), {"id": str(uuid.uuid4()), "pid": partner_id, "code": code})

            await db.execute(text("""
                UPDATE ch6_bulk_import_staging SET status = 'created', partner_id = :pid WHERE id = :id
            """), {"pid": partner_id, "id": row.id})
            created["agents"] += 1

        except Exception as e:
            await db.execute(text("""
                UPDATE ch6_bulk_import_staging SET status = 'error', error_message = :err WHERE id = :id
            """), {"err": str(e), "id": row.id})
            created["errors"] += 1

    await db.commit()

    await db.execute(text("""
        UPDATE insurance_networks SET
          total_managers = (SELECT COUNT(*) FROM partners WHERE network_id = :nid AND channel_type = 'insurance_manager'),
          total_agents = (SELECT COUNT(*) FROM partners WHERE network_id = :nid AND channel_type = 'insurance_agent')
        WHERE id = :nid
    """), {"nid": network_id})
    await db.commit()

    return {
        "batch_id": batch_id,
        "total_rows": len(rows),
        "created": created,
        "errors_detail_url": f"/api/admin/ch6/bulk-import/{batch_id}/errors",
    }


@router.get("/api/admin/ch6/bulk-import/{batch_id}/errors")
async def get_import_errors(batch_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT row_number, full_name, employee_number, role, error_message
        FROM ch6_bulk_import_staging
        WHERE import_batch_id = :batch AND status = 'error'
        ORDER BY row_number
    """), {"batch": batch_id})
    return [
        {"row": r.row_number, "name": r.full_name, "employee_number": r.employee_number,
         "role": r.role, "error": r.error_message}
        for r in result.fetchall()
    ]


@router.post("/api/ch6/conversions/process")
async def process_ch6_conversion(payload: CH6ConversionRequest, db: AsyncSession = Depends(get_db)):
    """
    Resolve agent -> manager -> network head hierarchy and create commission
    records for all 4 levels (agent, manager, network head, GM rider).
    Called every billing cycle for continuous commission.
    """
    agent_result = await db.execute(text("""
        SELECT p.id, p.full_name, p.status, p.parent_partner_id, p.channel_type
        FROM referral_codes rc
        JOIN partners p ON p.id = rc.partner_id
        WHERE rc.code = :code AND rc.channel_type = 'insurance_agent'
    """), {"code": payload.agent_referral_code.upper().strip()})
    agent = agent_result.fetchone()
    if not agent:
        raise HTTPException(status_code=404, detail="Insurance agent referral code not found")

    manager = None
    if agent.parent_partner_id:
        mgr_result = await db.execute(text("""
            SELECT id, full_name, status, parent_partner_id FROM partners WHERE id = :id
        """), {"id": str(agent.parent_partner_id)})
        manager = mgr_result.fetchone()

    network_head = None
    if manager and manager.parent_partner_id:
        nh_result = await db.execute(text("""
            SELECT id, full_name, status FROM partners WHERE id = :id
        """), {"id": str(manager.parent_partner_id)})
        network_head = nh_result.fetchone()

    gm_result = await db.execute(
        text("SELECT id FROM partners WHERE notes LIKE '%GM rider%' LIMIT 1")
    )
    gm = gm_result.fetchone()

    breakdown = calculate_ch6_commission(
        plan=payload.plan,
        agent_active=(agent.status == "active"),
        manager_active=(manager.status == "active") if manager else False,
        network_head_active=(network_head.status == "active") if network_head else False,
    )

    existing = await db.execute(
        text("SELECT id FROM conversions WHERE provider_txn_id = :txn"),
        {"txn": payload.provider_txn_id}
    )
    if existing.fetchone():
        return {"status": "already_processed", "txn_id": payload.provider_txn_id}

    conversion_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO conversions
          (id, subscriber_id, partner_id, channel_type, plan, plan_price_kes,
           payment_provider, provider_txn_id, status, subscription_month,
           is_first_conversion, confirmed_at)
        VALUES
          (:id, :sub_id, :agent_id, 'insurance_agent', :plan, :price,
           :provider, :txn, 'confirmed', :month, :is_first, NOW())
    """), {
        "id": conversion_id, "sub_id": payload.subscriber_id, "agent_id": str(agent.id),
        "plan": payload.plan, "price": breakdown["plan_price_kes"],
        "provider": payload.payment_provider, "txn": payload.provider_txn_id,
        "month": payload.subscription_month, "is_first": payload.is_first_conversion,
    })

    payout_month = datetime.now(timezone.utc).replace(day=1).date()
    levels = [(agent.id, "agent", breakdown["agent_rate"], breakdown["agent_kes"])]
    if manager:
        levels.append((manager.id, "manager_override", breakdown["manager_rate"], breakdown["manager_kes"]))
    if network_head:
        levels.append((network_head.id, "network_head_override", breakdown["network_head_rate"], breakdown["network_head_kes"]))
    if gm:
        levels.append((gm.id, "gm_rider", breakdown["gm_rider_rate"], breakdown["gm_rider_kes"]))

    created_commissions = []
    for partner_id, comm_type, rate, amount in levels:
        if amount <= Decimal("0.00"):
            continue
        comm_id = str(uuid.uuid4())
        await db.execute(text("""
            INSERT INTO commissions
              (id, conversion_id, partner_id, channel_type, commission_type,
               plan, plan_price_kes, commission_rate, commission_kes,
               subscription_month, status, payout_month)
            VALUES
              (:id, :conv_id, :partner_id, 'insurance_agent', :type,
               :plan, :price, :rate, :amount,
               :month, 'pending', :payout_month)
        """), {
            "id": comm_id, "conv_id": conversion_id, "partner_id": str(partner_id),
            "type": comm_type, "plan": payload.plan, "price": breakdown["plan_price_kes"],
            "rate": rate, "amount": amount, "month": payload.subscription_month,
            "payout_month": payout_month,
        })
        created_commissions.append({"partner_id": str(partner_id), "type": comm_type, "amount": str(amount)})

    await db.commit()

    return {
        "status": "processed",
        "conversion_id": conversion_id,
        "agent": agent.full_name,
        "manager": manager.full_name if manager else None,
        "network_head": network_head.full_name if network_head else None,
        "breakdown": {
            "agent_kes": str(breakdown["agent_kes"]),
            "manager_kes": str(breakdown["manager_kes"]),
            "network_head_kes": str(breakdown["network_head_kes"]),
            "gm_rider_kes": str(breakdown["gm_rider_kes"]),
            "total_kes": str(breakdown["total_kes"]),
        },
        "commissions_created": created_commissions,
    }


@router.get("/api/admin/ch6/networks")
async def list_networks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM v_ch6_network_performance"))
    return [
        {
            "network_id": str(r.network_id), "network_name": r.network_name,
            "network_head_name": r.network_head_name, "insurance_company": r.insurance_company,
            "total_managers": r.total_managers, "total_agents": r.total_agents,
            "total_subscribers": r.total_subscribers,
            "pending_commission_kes": float(r.pending_commission_kes),
            "paid_commission_kes": float(r.paid_commission_kes),
        }
        for r in result.fetchall()
    ]


@router.get("/api/admin/ch6/networks/{network_id}/managers")
async def list_managers(network_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT * FROM v_ch6_manager_teams mt
        JOIN partners p ON p.id = mt.manager_id
        WHERE p.network_id = :nid
        ORDER BY mt.team_subscribers DESC
    """), {"nid": network_id})
    return [
        {
            "manager_id": str(r.manager_id), "manager_name": r.manager_name,
            "team_code": r.team_code, "region": r.region,
            "team_size": r.team_size, "team_subscribers": r.team_subscribers,
            "manager_pending_kes": float(r.manager_pending_kes),
            "team_agents_pending_kes": float(r.team_agents_pending_kes),
        }
        for r in result.fetchall()
    ]


@router.get("/api/admin/ch6/managers/{manager_id}/agents")
async def list_agents_for_manager(manager_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT * FROM v_ch6_agent_performance ap
        JOIN partners p ON p.id = ap.agent_id
        WHERE p.parent_partner_id = :mgr_id
        ORDER BY ap.total_families_enrolled DESC
    """), {"mgr_id": manager_id})
    return [
        {
            "agent_id": str(r.agent_id), "agent_name": r.agent_name,
            "employee_number": r.employee_number, "phone": r.phone,
            "referral_code": r.referral_code,
            "referral_link": f"{BASE_URL}/?ref={r.referral_code}" if r.referral_code else None,
            "total_families_enrolled": r.total_families_enrolled,
            "total_conversions": r.total_conversions,
            "pending_kes": float(r.pending_kes), "paid_kes": float(r.paid_kes),
            "status": r.status,
        }
        for r in result.fetchall()
    ]


@router.get("/api/admin/ch6/agents/{agent_id}")
async def get_agent_detail(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM v_ch6_agent_performance WHERE agent_id = :id"), {"id": agent_id})
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {
        "agent_id": str(r.agent_id), "agent_name": r.agent_name,
        "employee_number": r.employee_number, "referral_code": r.referral_code,
        "referral_link": f"{BASE_URL}/?ref={r.referral_code}" if r.referral_code else None,
        "total_families_enrolled": r.total_families_enrolled,
        "total_conversions": r.total_conversions,
        "pending_kes": float(r.pending_kes), "paid_kes": float(r.paid_kes),
        "status": r.status,
    }
