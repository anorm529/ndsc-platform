-- Sessions are now stored in the auth DB (user_sessions table).
-- The fantasy_sessions table is no longer needed.

DROP TABLE IF EXISTS "fantasy_sessions";
