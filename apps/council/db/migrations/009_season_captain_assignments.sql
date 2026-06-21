-- Migration 009: Season-aware captain assignments (council DB)
-- Run against: COUNCIL_DATABASE_URL
--
-- Replaces captain_team_assignments (which referenced the empty council_teams table).
-- user_id and team_id are logical refs to users/teams in the main DB — no FK constraints.
-- Season-scoped: a different person can captain a team each year.

CREATE TABLE IF NOT EXISTS season_captain_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL,       -- logical ref to users.id in main DB
  team_id      UUID    NOT NULL,       -- logical ref to teams.id in main DB
  season_year  INTEGER NOT NULL,
  assigned_by  UUID    NOT NULL,       -- logical ref to users.id in main DB
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, season_year)         -- one captain per team per season
);

CREATE INDEX IF NOT EXISTS idx_season_captains_user   ON season_captain_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_season_captains_season ON season_captain_assignments(season_year);
