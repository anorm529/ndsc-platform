-- Migration 007: Season enrollment tables (main DB)
-- Run against: AUTH_DATABASE_URL (main/stats database)
--
-- season_enrollments: council-managed table that tracks which players are active
-- in a given season, and which team they are currently assigned to.
--
--   current_team_id = NULL  → enrolled but unassigned (in the pool)
--   current_team_id = <id>  → assigned to that team
--
-- This is separate from player_team_seasons (which is the stats backbone and
-- remains unchanged). When a captain assigns a player, both tables are updated:
-- season_enrollments.current_team_id is set, and a player_team_seasons row is
-- upserted so website stats remain correct.
--
-- season_roster_transfers: audit log of every team movement within a season.

CREATE TABLE IF NOT EXISTS season_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  current_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enrolled_by     UUID NOT NULL,  -- logical ref to users.id (no cross-DB FK)
  notes           TEXT,
  UNIQUE(player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_season_enrollments_season ON season_enrollments(season_id);
CREATE INDEX IF NOT EXISTS idx_season_enrollments_team   ON season_enrollments(current_team_id);
CREATE INDEX IF NOT EXISTS idx_season_enrollments_player ON season_enrollments(player_id);

CREATE TABLE IF NOT EXISTS season_roster_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id),
  season_id       UUID NOT NULL REFERENCES seasons(id),
  from_team_id    UUID REFERENCES teams(id),  -- NULL means was unassigned
  to_team_id      UUID REFERENCES teams(id),  -- NULL means moved to unassigned
  transferred_by  UUID NOT NULL,              -- logical ref to users.id
  notes           TEXT,
  transferred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_transfers_player_season
  ON season_roster_transfers(player_id, season_id);
CREATE INDEX IF NOT EXISTS idx_roster_transfers_season
  ON season_roster_transfers(season_id);
