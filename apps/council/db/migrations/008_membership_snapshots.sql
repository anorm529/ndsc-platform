-- Migration 008: Membership snapshots (council DB)
-- Run against: COUNCIL_DATABASE_URL (council database)
--
-- Stores a point-in-time freeze of all enrolled members at season archive time.
-- All fields are denormalised text — no FKs — so historical records are never
-- affected by future name changes, team renames, or player deletions.
--
-- Triggered manually by the owner when archiving a season.

CREATE TABLE IF NOT EXISTS membership_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year     INTEGER NOT NULL,
  player_id       UUID NOT NULL,       -- logical ref, no FK
  player_name     TEXT NOT NULL,
  gender          TEXT,
  team_name       TEXT,                -- NULL if unassigned at archive time
  fee_status      TEXT,                -- 'paid' | 'partial' | 'unpaid' | NULL
  fee_type        TEXT,                -- 'player' | 'rookie' | 'umpire' | 'custom' | NULL
  amount_due      NUMERIC(10,2),
  amount_paid     NUMERIC(10,2),
  is_rookie       BOOLEAN NOT NULL DEFAULT false,
  is_umpire       BOOLEAN NOT NULL DEFAULT false,
  snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshotted_by  UUID NOT NULL,       -- logical ref to users.id
  UNIQUE(player_id, season_year)       -- idempotent: re-archiving won't duplicate
);

CREATE INDEX IF NOT EXISTS idx_membership_snapshots_year
  ON membership_snapshots(season_year DESC);
