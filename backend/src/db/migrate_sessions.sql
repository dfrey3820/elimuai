-- ═══════════════════════════════════════════════════════════════════════════
-- Sessions + Subscription Notifications tables
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_jti     VARCHAR(64) UNIQUE NOT NULL,        -- JWT ID for this session
  ip_address    INET,
  user_agent    TEXT,
  is_revoked    BOOLEAN DEFAULT FALSE,
  last_active   TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user     ON user_sessions(user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_jti      ON user_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON user_sessions(expires_at);

-- ─── Subscription notification tracking ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL,  -- 'expiry_warning' | 'upgrade_nudge'
  days_before       INTEGER DEFAULT 0,
  channel           VARCHAR(10) DEFAULT 'email',
  sent_email        BOOLEAN DEFAULT FALSE,
  sent_sms          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_notif_user  ON subscription_notifications(user_id, notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_notif_type  ON subscription_notifications(notification_type, created_at);
