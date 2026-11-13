-- ============================================================================
-- 013_network_agent_tiers.mysql.sql   (MySQL 8.0+ / MariaDB 10.6+)
--
-- Network-agent hierarchy + credential lifecycle:
--   * marketing_agents.tier         — 'manager' | 'agent'
--   * marketing_agents.manager_id   — agent's managing agent (self-ref)
--   * marketing_agents.override_rate — manager override on their agents' sales
--   * agent_commissions.kind        — 'direct' | 'override'
--   * agent_commissions unique(referral_id, agent_id) so a manager override and
--     the agent's direct commission can coexist for one referral
--   * users.must_reset_password     — forces a password reset on next login
--   * triggers rewritten to also award the manager an override commission
--
-- Idempotent: guarded with information_schema so it is safe to re-run.
-- Run via the mysql CLI (uses DELIMITER):  mysql <db> < 013_network_agent_tiers.mysql.sql
-- ============================================================================

SET @db := DATABASE();

-- ─── marketing_agents.tier ──────────────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='marketing_agents' AND COLUMN_NAME='tier');
SET @sql := IF(@exists=0,
  "ALTER TABLE marketing_agents ADD COLUMN tier VARCHAR(16) NOT NULL DEFAULT 'agent' AFTER agent_code",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── marketing_agents.manager_id ────────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='marketing_agents' AND COLUMN_NAME='manager_id');
SET @sql := IF(@exists=0,
  "ALTER TABLE marketing_agents ADD COLUMN manager_id CHAR(36) NULL AFTER tier",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── marketing_agents.override_rate ─────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='marketing_agents' AND COLUMN_NAME='override_rate');
SET @sql := IF(@exists=0,
  "ALTER TABLE marketing_agents ADD COLUMN override_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500 AFTER commission_rate",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- manager_id FK + index
SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='marketing_agents' AND INDEX_NAME='idx_marketing_agents_manager');
SET @sql := IF(@exists=0,
  "ALTER TABLE marketing_agents ADD KEY idx_marketing_agents_manager (manager_id)",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='marketing_agents' AND CONSTRAINT_NAME='fk_marketing_agents_manager');
SET @sql := IF(@exists=0,
  "ALTER TABLE marketing_agents ADD CONSTRAINT fk_marketing_agents_manager FOREIGN KEY (manager_id) REFERENCES marketing_agents(id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── agent_commissions.kind ─────────────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='agent_commissions' AND COLUMN_NAME='kind');
SET @sql := IF(@exists=0,
  "ALTER TABLE agent_commissions ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'direct' AFTER status",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Swap UNIQUE(referral_id) → UNIQUE(referral_id, agent_id) so a manager override
-- row can live alongside the agent's direct row for the same referral.
SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='agent_commissions' AND INDEX_NAME='uq_agent_commissions_referral');
SET @sql := IF(@exists>0,
  "ALTER TABLE agent_commissions DROP INDEX uq_agent_commissions_referral",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='agent_commissions' AND INDEX_NAME='uq_agent_commissions_referral_agent');
SET @sql := IF(@exists=0,
  "ALTER TABLE agent_commissions ADD UNIQUE KEY uq_agent_commissions_referral_agent (referral_id, agent_id)",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── users.must_reset_password ──────────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='must_reset_password');
SET @sql := IF(@exists=0,
  "ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN NOT NULL DEFAULT FALSE AFTER password_hash",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── Triggers: direct commission (agent) + override commission (manager) ────
DROP TRIGGER IF EXISTS trg_award_agent_commission_ins;
DROP TRIGGER IF EXISTS trg_award_agent_commission_upd;

DELIMITER $$

CREATE TRIGGER trg_award_agent_commission_ins
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' THEN
    -- direct commission for the referring agent
    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status, kind
    )
    SELECT
      UUID(), ar.agent_id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, ma.commission_rate, ROUND(NEW.amount * ma.commission_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending', 'direct'
    FROM agent_referrals ar
    JOIN marketing_agents ma ON ma.id = ar.agent_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE
    LIMIT 1;

    -- override commission for that agent's manager (if any)
    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status, kind
    )
    SELECT
      UUID(), mgr.id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, mgr.override_rate, ROUND(NEW.amount * mgr.override_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending', 'override'
    FROM agent_referrals ar
    JOIN marketing_agents ma  ON ma.id = ar.agent_id
    JOIN marketing_agents mgr ON mgr.id = ma.manager_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE AND mgr.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

CREATE TRIGGER trg_award_agent_commission_upd
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status, kind
    )
    SELECT
      UUID(), ar.agent_id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, ma.commission_rate, ROUND(NEW.amount * ma.commission_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending', 'direct'
    FROM agent_referrals ar
    JOIN marketing_agents ma ON ma.id = ar.agent_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE
    LIMIT 1;

    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status, kind
    )
    SELECT
      UUID(), mgr.id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, mgr.override_rate, ROUND(NEW.amount * mgr.override_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending', 'override'
    FROM agent_referrals ar
    JOIN marketing_agents ma  ON ma.id = ar.agent_id
    JOIN marketing_agents mgr ON mgr.id = ma.manager_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE AND mgr.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

DELIMITER ;
