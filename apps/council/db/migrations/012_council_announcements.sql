-- Stores a record of every announcement sent to players / captains / council
CREATE TABLE IF NOT EXISTS council_announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT    NOT NULL,
  body          TEXT    NOT NULL,
  recipients    TEXT    NOT NULL CHECK (recipients IN ('all_enrolled', 'all_captains', 'all_council', 'team')),
  team_id       UUID,
  team_name     TEXT,
  sent_count    INTEGER NOT NULL DEFAULT 0,
  failed_count  INTEGER NOT NULL DEFAULT 0,
  sent_by       UUID    NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_council_announcements_sent ON council_announcements(sent_at DESC);
