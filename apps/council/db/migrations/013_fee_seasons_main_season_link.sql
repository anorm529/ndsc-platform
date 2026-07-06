-- Link fee_seasons to the main DB seasons table so fee status on the members
-- page always reflects the correct playing season, not just whatever fee season
-- happens to be marked is_active.
--
-- main_season_id is nullable: existing manually-created fee seasons won't have
-- a link, but newly auto-created ones will.

ALTER TABLE fee_seasons ADD COLUMN main_season_id UUID;
