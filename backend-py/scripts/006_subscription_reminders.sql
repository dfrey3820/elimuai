-- 006_subscription_reminders.sql
-- Tracks admin subscription-reminder emails so the scheduler stays idempotent.
-- Idempotent.

CREATE TABLE IF NOT EXISTS subscription_reminders (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        VARCHAR(30) NOT NULL,          -- 'free_upgrade' | 'expiring_soon'
  reference   DATE,                          -- expiring: plan_expires::date; free: NULL
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_reminders_user_kind_sent
  ON subscription_reminders(user_id, kind, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_reminders_user_kind_ref
  ON subscription_reminders(user_id, kind, reference);
