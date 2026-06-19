-- NDSC Council Dashboard — Initial Schema
-- Stored in COUNCIL_DATABASE_URL (separate Neon database)
-- Users are referenced by user_id (logical ref to users table in AUTH_DATABASE_URL)

-- ─── Teams ────────────────────────────────────────────────────────────────────

CREATE TABLE council_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  season_year  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, season_year)
);

-- Which users belong to which team (per season)
CREATE TABLE council_member_teams (
  user_id   UUID NOT NULL,
  team_id   UUID NOT NULL REFERENCES council_teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

-- Which captains manage which teams
CREATE TABLE captain_team_assignments (
  user_id   UUID NOT NULL,
  team_id   UUID NOT NULL REFERENCES council_teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

CREATE INDEX idx_council_member_teams_user ON council_member_teams(user_id);
CREATE INDEX idx_council_member_teams_team ON council_member_teams(team_id);
CREATE INDEX idx_captain_assignments_user   ON captain_team_assignments(user_id);

-- ─── Fee Seasons ──────────────────────────────────────────────────────────────

CREATE TABLE fee_seasons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year          INTEGER NOT NULL UNIQUE,
  label         TEXT    NOT NULL,
  standard_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Player Fees ──────────────────────────────────────────────────────────────
-- One record per user per season. Tracks what is owed.

CREATE TABLE player_fees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL,
  player_name  TEXT    NOT NULL,
  team_id      UUID    REFERENCES council_teams(id) ON DELETE SET NULL,
  season_id    UUID    NOT NULL REFERENCES fee_seasons(id) ON DELETE CASCADE,
  amount_due   NUMERIC(10,2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Individual payment transactions against a player fee record
CREATE TABLE fee_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_fee_id  UUID    NOT NULL REFERENCES player_fees(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT    NOT NULL DEFAULT 'bank_transfer',
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference      TEXT,
  notes          TEXT,
  recorded_by    UUID    NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_fees_season    ON player_fees(season_id);
CREATE INDEX idx_player_fees_user      ON player_fees(user_id);
CREATE INDEX idx_player_fees_team      ON player_fees(team_id);
CREATE INDEX idx_fee_payments_fee      ON fee_payments(player_fee_id);

-- ─── Club Accounts ────────────────────────────────────────────────────────────

CREATE TABLE club_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE account_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID    NOT NULL REFERENCES club_accounts(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
  category     TEXT    NOT NULL DEFAULT 'other',
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description  TEXT    NOT NULL,
  date         DATE    NOT NULL,
  reference    TEXT,
  recorded_by  UUID    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_transactions_account ON account_transactions(account_id);
CREATE INDEX idx_account_transactions_date    ON account_transactions(date DESC);

-- ─── Council Meetings ─────────────────────────────────────────────────────────

CREATE TABLE council_meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'council' CHECK (type IN ('agm', 'council', 'committee')),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  location      TEXT,
  agenda        TEXT,
  minutes       TEXT,
  status        TEXT    NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by    UUID    NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meeting_attendees (
  meeting_id  UUID    NOT NULL REFERENCES council_meetings(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL,
  attended    BOOLEAN,
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX idx_council_meetings_scheduled ON council_meetings(scheduled_at DESC);
CREATE INDEX idx_meeting_attendees_user     ON meeting_attendees(user_id);

-- ─── Action Items ─────────────────────────────────────────────────────────────

CREATE TABLE action_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID    REFERENCES council_meetings(id) ON DELETE SET NULL,
  assigned_to  UUID,
  title        TEXT    NOT NULL,
  description  TEXT,
  due_date     DATE,
  status       TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority     TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by   UUID    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_items_assigned ON action_items(assigned_to);
CREATE INDEX idx_action_items_meeting  ON action_items(meeting_id);
CREATE INDEX idx_action_items_status   ON action_items(status);
CREATE INDEX idx_action_items_due      ON action_items(due_date);
