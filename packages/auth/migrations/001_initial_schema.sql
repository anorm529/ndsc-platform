-- NDSC Auth Database — Initial Schema
-- Run this once against the AUTH database (not the main stats DB)

CREATE TYPE user_role AS ENUM ('player', 'admin', 'owner');
CREATE TYPE user_account_status AS ENUM ('active', 'pending', 'disabled');

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             user_role NOT NULL DEFAULT 'player',
  -- Logical reference to players(id) in the main stats DB — no FK constraint across DBs
  player_id        UUID,
  email_verified   BOOLEAN NOT NULL DEFAULT false,
  account_status   user_account_status NOT NULL DEFAULT 'pending',
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_player_id ON users(player_id);
CREATE INDEX idx_users_status    ON users(account_status);
CREATE INDEX idx_users_role      ON users(role);

-- ─── Sessions ─────────────────────────────────────────────────────────────────

CREATE TABLE user_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token  TEXT NOT NULL UNIQUE,   -- SHA-256 hash of the raw token
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_name    TEXT,
  ip_address     INET,
  app            TEXT NOT NULL DEFAULT 'website'  -- 'website' | 'admin' | 'fantasy' | 'tournament'
);

CREATE INDEX idx_sessions_user_id   ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires   ON user_sessions(expires_at);
CREATE INDEX idx_sessions_app       ON user_sessions(app);

-- ─── Password Reset Tokens ────────────────────────────────────────────────────

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 hash of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_user_id  ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_expires  ON password_reset_tokens(expires_at);

-- ─── Email Events ─────────────────────────────────────────────────────────────

CREATE TABLE email_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  email                TEXT NOT NULL,
  type                 TEXT NOT NULL,   -- 'password_reset' | 'email_verification' | 'admin_notification'
  provider             TEXT NOT NULL DEFAULT 'resend',
  provider_message_id  TEXT,
  status               TEXT NOT NULL,   -- 'sent' | 'failed' | 'delivered' | 'bounced'
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_user_id    ON email_events(user_id);
CREATE INDEX idx_email_events_type       ON email_events(type, status);
CREATE INDEX idx_email_events_created    ON email_events(created_at);

-- ─── Admin Audit Log ──────────────────────────────────────────────────────────

CREATE TABLE admin_audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Logical reference to players(id) in main DB
  target_player_id UUID,
  action           TEXT NOT NULL,
  field_name       TEXT,
  previous_value   JSONB,
  new_value        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor         ON admin_audit_log(actor_user_id);
CREATE INDEX idx_audit_target_user   ON admin_audit_log(target_user_id);
CREATE INDEX idx_audit_created       ON admin_audit_log(created_at);

-- ─── Admin Notes ──────────────────────────────────────────────────────────────

CREATE TABLE admin_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  target_player_id UUID,
  note             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_target_user ON admin_notes(target_user_id);
CREATE INDEX idx_notes_actor       ON admin_notes(actor_user_id);
