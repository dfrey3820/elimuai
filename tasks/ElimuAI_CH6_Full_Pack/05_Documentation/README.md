# ElimuAI CH6 — Insurance Agent Network
## Setup & Integration Guide

---

## Overview

CH6 extends ElimuAI's distribution model with a **continuous, 3-tier commission
structure** for insurance agent networks. Built for your friend's network of
1,200 agents organised under managers, reporting to him as network head.

**Commission split (continuous, no diminishing):**

| Level | Rate | Notes |
|---|---|---|
| Insurance Agent | 15% | Per family they personally enrolled |
| Manager (override) | 8% | On all agents in their team |
| Network Head (override) | 5% | Across the entire 1,200-agent network |
| GM Rider | 5% | Consistent with all other ElimuAI channels |
| **Total** | **33%** | Continuous, every billing cycle |

This is **continuous** like Teachers/Principals (CH2) — no diminishing
schedule. As long as a family stays subscribed, all four levels keep earning
every month/term. Tax (35%, already baked into ElimuAI's pricing) applies the
same way as all other channels — each party is responsible for their own tax
on commission income received.

---

## Files in this package

| File | Purpose |
|---|---|
| `004_ch6_migration.sql` | DB schema — hierarchy, networks, rates, views |
| `ch6_commission_engine.py` | Pure Python commission calculation logic |
| `ch6_router.py` | FastAPI routes — network setup, bulk import, processing, dashboards |
| `InsuranceNetworkDashboard.jsx` | React dashboard (3 views: head, manager, agent) |

---

## Step 1 — Run the migration

```bash
psql -U your_db_user -d your_elimuai_db -f 004_ch6_migration.sql
```

This adds:
- New `channel_type` enum values: `insurance_agent`, `insurance_manager`, `insurance_network_head`
- `parent_partner_id`, `network_id`, `team_code`, `employee_number`, `insurance_company` columns on `partners`
- `insurance_networks` table
- `ch6_commission_rates` table (rates stored in DB — adjustable without code changes)
- `ch6_bulk_import_staging` table for the CSV import
- Three views: network performance, manager teams, agent performance

---

## Step 2 — Add the router

```python
from app.routers.ch6_insurance_network import router as ch6_router
app.include_router(ch6_router)
```

---

## Step 3 — Create the network

```bash
curl -X POST https://api.elimuai.africa/api/admin/ch6/networks \
  -H "Content-Type: application/json" \
  -d '{
    "network_name": "[Friend Name] Insurance Agency Network",
    "head_full_name": "[Friend Full Name]",
    "head_phone": "+254700000000",
    "head_mpesa_number": "+254700000000",
    "head_email": "friend@example.com",
    "insurance_company": "[Insurance Company Name]"
  }'
```

Save the returned `network_id` — you'll need it for the bulk import.

---

## Step 4 — Bulk import the 1,200 agents

### Get the CSV template
```bash
curl https://api.elimuai.africa/api/admin/ch6/csv-template -o ch6_template.csv
```

### CSV format
```csv
full_name,phone,mpesa_number,email,role,employee_number,manager_employee_number,region,custom_code
Jane Wanjiru,+254712000001,+254712000001,jane.w@example.com,manager,MGR-001,,Nairobi,
John Otieno,+254712000002,+254712000002,john.o@example.com,agent,AGT-1001,MGR-001,Nairobi,
Mary Achieng,+254712000003,+254712000003,mary.a@example.com,agent,AGT-1002,MGR-001,Nairobi,
```

**Important:**
- Put `role = manager` rows for all team managers
- Put `role = agent` rows for all 1,200 agents
- Each agent's `manager_employee_number` must match a manager's `employee_number`
- The import processes managers first (Pass 1), then agents (Pass 2) — so
  managers always exist before their agents are linked
- `custom_code` is optional — if blank, a referral code is auto-generated
  (e.g. `AGT-JOHN-A1B2`)

### Upload
```bash
curl -X POST "https://api.elimuai.africa/api/admin/ch6/bulk-import?network_id=YOUR_NETWORK_ID" \
  -F "file=@ch6_agents_1200.csv"
```

Response includes counts of managers/agents created and any errors:
```json
{
  "batch_id": "...",
  "total_rows": 1210,
  "created": { "managers": 10, "agents": 1200, "errors": 0 },
  "errors_detail_url": "/api/admin/ch6/bulk-import/{batch_id}/errors"
}
```

If there are errors (e.g. missing manager), check:
```bash
curl https://api.elimuai.africa/api/admin/ch6/bulk-import/{batch_id}/errors
```

---

## Step 5 — How tracking works going forward

1. Each of the 1,200 agents gets a unique referral code (e.g. `AGT-JOHN-A1B2`)
   and link (`elimuai.africa/?ref=AGT-JOHN-A1B2`), shown in their dashboard
2. They share this with families they're enrolling
3. When a family subscribes using that code, the existing tracking system
   (from the earlier package) attributes the conversion to that agent
4. Every billing cycle (monthly for individual plans, termly for school plans),
   call `/api/ch6/conversions/process` with the agent's referral code and
   plan — this creates commission records for all 4 levels automatically
5. The system walks the hierarchy: agent → manager → network head → GM,
   checking each level's `active` status before crediting them

**Recommended automation:** hook this into your existing M-Pesa/Stripe
recurring payment webhook (from the channel tracking package) — when a
recurring payment confirms for a subscriber whose `referred_by_partner_id`
points to an `insurance_agent`, call the CH6 processing endpoint automatically.

---

## Step 6 — Dashboards

Mount `InsuranceNetworkDashboard.jsx` with the appropriate role:

```jsx
// For your friend (network head) — sees everything
<InsuranceNetworkDashboard role="network_head" />

// For a manager — sees only their team
<InsuranceNetworkDashboard role="manager" partnerId={managerPartnerId} />

// For an individual agent — sees their own referral link & stats
<InsuranceNetworkDashboard role="agent" partnerId={agentPartnerId} />
```

The **agent view** is the most important for adoption — each of the 1,200
agents should be able to log in (via a simple phone-number + OTP flow) and
immediately see their referral link, families enrolled, and pending commission.
This is what keeps them motivated to keep sharing.

---

## What happens if someone leaves

| Who leaves | Effect |
|---|---|
| **Agent** | Their 15% is forfeited going forward. Manager's 8% and Network Head's 5% continue uninterrupted (they're overrides on the network, not the individual sale). GM rider continues. |
| **Manager** | Their 8% override is forfeited. Agents under them continue earning their 15% normally — consider reassigning them to another manager. Network Head's 5% continues. |
| **Network Head** | Their 5% is forfeited. Agents and managers continue earning normally — this requires either renegotiating the partnership or absorbing that 5% back into ElimuAI's margin. |

This logic is already built into `calculate_ch6_commission()` via the
`agent_active`, `manager_active`, `network_head_active` flags.

---

## Example commission breakdown (2 Children plan, KES 499/month)

| Level | Rate | Amount |
|---|---|---|
| Agent | 15% | KES 74.85 |
| Manager override | 8% | KES 39.92 |
| Network Head override | 5% | KES 24.95 |
| GM Rider | 5% | KES 24.95 |
| **Total commission** | **33%** | **KES 164.67** |
| **ElimuAI retains** | **67%** | **KES 334.33** (before 35% tax) |

This repeats every month the family stays subscribed — and every term for
the School Plan (KES 15,000 → KES 4,950 total commission per term).

---

## Next steps

1. Confirm with your friend: total agent count, manager structure (how many
   managers, how agents are grouped), and get the CSV data in the format above
2. Run the bulk import as a test batch first (10–20 agents) to validate the
   structure before importing all 1,200
3. Draft a simple one-page agreement for the network (similar structure to
   the channel partner agreements built earlier) — covering the 33% split,
   continuous model, forfeiture rules, and payment terms
4. Set up agent login (phone + OTP) so all 1,200 can access their referral
   links and dashboards independently

---

*ElimuAI CH6 — Insurance Agent Network | Venus Unzag Limited | April 2026*
