-- Council DB: enriched player profiles
-- player_id is a logical reference to players.id in the main stats DB (no FK constraint)

CREATE TABLE player_profiles (
  player_id     UUID        PRIMARY KEY,
  year_of_birth INTEGER,
  postcode      TEXT,
  is_rookie     BOOLEAN     NOT NULL DEFAULT false,
  is_umpire     BOOLEAN     NOT NULL DEFAULT false,
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
