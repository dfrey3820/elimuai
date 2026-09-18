-- ============================================================================
-- 011_plan_type_add_teacher_parent.sql
--
-- Add 'teacher' and 'parent' values to the plan_type enum so the billing
-- service can persist those subscription tiers (they were already priced
-- in pricing.py and accepted by the API schema, but writes to
-- users.plan / payments.plan / invoices.plan blew up with
-- InvalidTextRepresentationError: invalid input value for enum plan_type).
--
-- Idempotent: safe to re-run (IF NOT EXISTS added in PostgreSQL 9.6+).
-- Must NOT be wrapped in a transaction — ALTER TYPE ... ADD VALUE cannot
-- run inside a BEGIN block, so psql must execute this file with autocommit
-- (default when using `psql -f` or `\i` at the top level).
-- ============================================================================

ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'parent';
