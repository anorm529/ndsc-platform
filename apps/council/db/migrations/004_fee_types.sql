-- Add tiered fee rates to fee_seasons
-- standard_fee is repurposed as the player (standard) fee
ALTER TABLE fee_seasons
  ADD COLUMN rookie_fee NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN umpire_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Track which fee tier each player is on
ALTER TABLE player_fees
  ADD COLUMN fee_type TEXT NOT NULL DEFAULT 'player'
    CHECK (fee_type IN ('player', 'rookie', 'umpire', 'custom'));
