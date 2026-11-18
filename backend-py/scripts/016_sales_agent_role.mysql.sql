-- ============================================================================
-- 016_sales_agent_role.mysql.sql   (MySQL 8.0+ / MariaDB 10.6+)
--
-- Direct sales agents (014) need 'sales_agent' as a valid users.role value.
-- Without it, creating/promoting a sales agent silently stored an empty role,
-- so agents fell through to the billing paywall instead of their dashboard.
--
--   * users.role gains 'sales_agent'
--   * existing sales-agent accounts whose role was lost are repaired
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ─── users.role: add sales_agent (keep all previously-added roles) ───────────
ALTER TABLE users
  MODIFY COLUMN role
  ENUM('student','teacher','parent','admin','super_admin','marketing_agent','insurance_manager','insurance_agent','sales_agent')
  NOT NULL DEFAULT 'student';

-- ─── Repair agents created before the enum included 'sales_agent' ────────────
-- (role was coerced to '' on insert/update). Never downgrade an admin.
UPDATE users u
  JOIN sales_agents sa ON sa.user_id = u.id
   SET u.role = 'sales_agent'
 WHERE u.role NOT IN ('admin','super_admin','sales_agent');
