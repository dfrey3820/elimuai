-- ============================================================================
-- 010_marketing_agents.sql
--
-- Marketing agents feature:
--   * marketing_agents  — one row per agent (linked to a users row)
--   * agent_referrals   — user ↔ agent link, one referral per user
--   * agent_commissions — one commission row per referral (first-payment-only)
--   * trigger on payments → auto-inserts a commission when a payment first
--     transitions to status='completed'
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Add the marketing_agent role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'marketing_agent'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'marketing_agent';
    END IF;
END $$;

-- 2. marketing_agents
CREATE TABLE IF NOT EXISTS marketing_agents (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    agent_code         VARCHAR(32) NOT NULL UNIQUE,
    commission_rate    NUMERIC(5,4) NOT NULL DEFAULT 0.15 CHECK (commission_rate >= 0 AND commission_rate <= 1),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    payout_method      VARCHAR(32),        -- 'mpesa' | 'bank' | 'manual'
    payout_details     JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_agents_user   ON marketing_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_agents_active ON marketing_agents(is_active) WHERE is_active;

-- 3. agent_referrals — one row per referred user
CREATE TABLE IF NOT EXISTS agent_referrals (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id     UUID NOT NULL REFERENCES marketing_agents(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    source       VARCHAR(32) NOT NULL DEFAULT 'link',  -- 'link' | 'code' | 'agent_added'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent ON agent_referrals(agent_id);

-- 4. agent_commissions — first-payment-only commission event
CREATE TABLE IF NOT EXISTS agent_commissions (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id           UUID NOT NULL REFERENCES marketing_agents(id) ON DELETE CASCADE,
    referral_id        UUID NOT NULL UNIQUE REFERENCES agent_referrals(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id         UUID REFERENCES payments(id) ON DELETE SET NULL,
    base_amount        NUMERIC(12,2) NOT NULL,
    commission_rate    NUMERIC(5,4) NOT NULL,
    commission_amount  NUMERIC(12,2) NOT NULL,
    currency           VARCHAR(5) NOT NULL DEFAULT 'KES',
    status             VARCHAR(24) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'void')),
    paid_at            TIMESTAMPTZ,
    paid_by            UUID REFERENCES users(id),
    payout_reference   VARCHAR(120),
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_status
    ON agent_commissions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_user
    ON agent_commissions(user_id);

-- 5. Trigger: on payments → 'completed', insert commission for the referring
-- agent (first payment only, enforced by UNIQUE(referral_id) above).
CREATE OR REPLACE FUNCTION fn_award_agent_commission()
RETURNS TRIGGER AS $$
DECLARE
    r_id       UUID;
    a_id       UUID;
    a_rate     NUMERIC(5,4);
    a_active   BOOLEAN;
BEGIN
    -- Only fire on a transition INTO 'completed'
    IF NEW.status <> 'completed' THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
        RETURN NEW;  -- already completed, don't double-award
    END IF;

    SELECT ar.id, ar.agent_id, ma.commission_rate, ma.is_active
      INTO r_id, a_id, a_rate, a_active
      FROM agent_referrals ar
      JOIN marketing_agents ma ON ma.id = ar.agent_id
     WHERE ar.user_id = NEW.user_id
     LIMIT 1;

    IF r_id IS NULL OR NOT a_active THEN
        RETURN NEW;
    END IF;

    -- ON CONFLICT DO NOTHING enforces first-payment-only via UNIQUE(referral_id)
    INSERT INTO agent_commissions (
        agent_id, referral_id, user_id, payment_id,
        base_amount, commission_rate, commission_amount, currency, status
    ) VALUES (
        a_id, r_id, NEW.user_id, NEW.id,
        NEW.amount, a_rate, ROUND(NEW.amount * a_rate, 2),
        COALESCE(NEW.currency, 'KES'), 'pending'
    )
    ON CONFLICT (referral_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_agent_commission_ins ON payments;
CREATE TRIGGER trg_award_agent_commission_ins
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_award_agent_commission();

DROP TRIGGER IF EXISTS trg_award_agent_commission_upd ON payments;
CREATE TRIGGER trg_award_agent_commission_upd
    AFTER UPDATE OF status ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_award_agent_commission();
