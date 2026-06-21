-- Migration 006: Add status column to seasons (main DB)
-- Run against: AUTH_DATABASE_URL (main/stats database)
--
-- Adds a proper state machine to seasons:
--   draft     → created, not yet open for enrollment
--   active    → current season, enrollment and roster management open
--   closed    → season over, stats locked, awaiting archive
--   archived  → membership snapshot taken, fully historical

ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'closed', 'archived'));

-- Backfill: active seasons stay 'active', inactive ones become 'archived'
UPDATE seasons SET status = CASE WHEN is_active THEN 'active' ELSE 'archived' END;

CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
