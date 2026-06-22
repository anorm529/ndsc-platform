-- Switch player_fees to use player_id (from main stats DB) as the canonical identifier.
-- user_id becomes optional (set when the player has a platform account).

ALTER TABLE player_fees ADD COLUMN player_id UUID;

-- Make user_id optional
ALTER TABLE player_fees ALTER COLUMN user_id DROP NOT NULL;

-- Drop the old unique constraint (user_id, season_id)
ALTER TABLE player_fees DROP CONSTRAINT player_fees_user_id_season_id_key;

-- New unique constraint on (player_id, season_id)
ALTER TABLE player_fees ADD CONSTRAINT player_fees_player_season_key
  UNIQUE (player_id, season_id);

CREATE INDEX idx_player_fees_player ON player_fees(player_id);
