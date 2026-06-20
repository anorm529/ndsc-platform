-- Tournament interest registrations submitted from the public website
-- Covers both individual players and team entries for future NDSC women's tournaments

CREATE TABLE tournament_interest (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL CHECK (type IN ('player', 'team')),

  -- Shared fields
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  notes        TEXT,

  -- Player-only
  experience   TEXT        CHECK (experience IN ('never', 'beginner', 'some', 'experienced')),

  -- Team-only
  team_name    TEXT,
  team_size    INTEGER     CHECK (team_size > 0),

  -- Meta
  tournament   TEXT        NOT NULL DEFAULT '2027',
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'contacted', 'confirmed', 'withdrawn')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tournament_interest_type       ON tournament_interest(type);
CREATE INDEX idx_tournament_interest_status     ON tournament_interest(status);
CREATE INDEX idx_tournament_interest_created_at ON tournament_interest(created_at DESC);
