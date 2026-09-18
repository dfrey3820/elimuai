# ============================================================
# ElimuAI CH6 — Insurance Agent Network Commission Logic
# app/services/ch6_commission_engine.py
#
# Extends commission_engine.py with the 3-tier continuous model:
#   Agent (15%) -> Manager override (8%) -> Network Head override (5%)
#   + GM Rider (5%) on top — total 33%
#
# All continuous (no diminishing), same as Teachers/Principals (CH2).
# ============================================================
from decimal import Decimal, ROUND_HALF_UP

PLAN_PRICES = {
    "child_1":     Decimal("299.00"),
    "child_2":     Decimal("499.00"),
    "child_3plus": Decimal("699.00"),
    "school":      Decimal("15000.00"),
}

# CH6 rates — continuous, every month/term, no diminishing
CH6_AGENT_RATE        = Decimal("0.15")
CH6_MANAGER_RATE      = Decimal("0.08")
CH6_NETWORK_HEAD_RATE = Decimal("0.05")
CH6_GM_RIDER_RATE     = Decimal("0.05")

CH6_TOTAL_RATE = CH6_AGENT_RATE + CH6_MANAGER_RATE + CH6_NETWORK_HEAD_RATE + CH6_GM_RIDER_RATE  # 0.33


def kes(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_ch6_commission(
    plan: str,
    agent_active: bool = True,
    manager_active: bool = True,
    network_head_active: bool = True,
) -> dict:
    """
    Calculate the full 3-tier + GM rider commission breakdown for a single
    conversion/renewal event in the Insurance Agent Network channel (CH6).

    Continuous: called every month (or term, for school plans) that the
    referred subscriber remains active and paying. No diminishing schedule.

    If a level's partner is inactive (left the network), their portion is
    forfeited. The GM rider always continues. Manager/Network Head overrides
    continue independently of whether the agent below them is still active.
    """
    price = PLAN_PRICES[plan]

    agent_kes        = kes(price * CH6_AGENT_RATE)        if agent_active        else Decimal("0.00")
    manager_kes      = kes(price * CH6_MANAGER_RATE)      if manager_active      else Decimal("0.00")
    network_head_kes = kes(price * CH6_NETWORK_HEAD_RATE) if network_head_active else Decimal("0.00")
    gm_kes           = kes(price * CH6_GM_RIDER_RATE)

    total = kes(agent_kes + manager_kes + network_head_kes + gm_kes)

    return {
        "plan": plan,
        "plan_price_kes": price,
        "agent_rate": CH6_AGENT_RATE if agent_active else Decimal("0.00"),
        "agent_kes": agent_kes,
        "manager_rate": CH6_MANAGER_RATE if manager_active else Decimal("0.00"),
        "manager_kes": manager_kes,
        "network_head_rate": CH6_NETWORK_HEAD_RATE if network_head_active else Decimal("0.00"),
        "network_head_kes": network_head_kes,
        "gm_rider_rate": CH6_GM_RIDER_RATE,
        "gm_rider_kes": gm_kes,
        "total_kes": total,
        "notes": f"CH6 Insurance Network | Continuous | {plan}",
    }


def resolve_hierarchy(agent_partner: dict, all_partners: dict) -> dict:
    """
    Given an agent partner record and a lookup of all partners by id,
    walk up the hierarchy to find the manager and network head.

    agent_partner: dict with at least 'id', 'parent_partner_id', 'status'
    all_partners: dict mapping partner_id (str) -> partner dict
    """
    agent = agent_partner
    manager = all_partners.get(str(agent.get("parent_partner_id"))) if agent.get("parent_partner_id") else None
    network_head = None
    if manager and manager.get("parent_partner_id"):
        network_head = all_partners.get(str(manager["parent_partner_id"]))

    return {
        "agent": agent,
        "agent_active": agent.get("status") == "active",
        "manager": manager,
        "manager_active": (manager.get("status") == "active") if manager else False,
        "network_head": network_head,
        "network_head_active": (network_head.get("status") == "active") if network_head else False,
    }


if __name__ == "__main__":
    result = calculate_ch6_commission("child_2", agent_active=True, manager_active=True, network_head_active=True)
    print(f"Plan: {result['plan']} (KES {result['plan_price_kes']})")
    print(f"  Agent:        KES {result['agent_kes']}  ({float(result['agent_rate'])*100}%)")
    print(f"  Manager:      KES {result['manager_kes']}  ({float(result['manager_rate'])*100}%)")
    print(f"  Network Head: KES {result['network_head_kes']}  ({float(result['network_head_rate'])*100}%)")
    print(f"  GM Rider:     KES {result['gm_rider_kes']}  ({float(result['gm_rider_rate'])*100}%)")
    print(f"  TOTAL:        KES {result['total_kes']}")
    print()

    result2 = calculate_ch6_commission("child_2", agent_active=False, manager_active=True, network_head_active=True)
    print("If agent has left (forfeits their 15%):")
    print(f"  Agent:        KES {result2['agent_kes']}")
    print(f"  Manager:      KES {result2['manager_kes']}")
    print(f"  Network Head: KES {result2['network_head_kes']}")
    print(f"  GM Rider:     KES {result2['gm_rider_kes']}")
    print(f"  TOTAL:        KES {result2['total_kes']}")
