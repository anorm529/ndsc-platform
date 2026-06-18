-- Consolidate AUTH_DATABASE into MAIN_DATABASE
--
-- Previously @ndsc/auth wrote to a separate Neon project (AUTH_DATABASE_URL).
-- All apps now point AUTH_DATABASE_URL at this database (MAIN_DATABASE).
--
-- The only structural gap is the `app` column in user_sessions, which
-- @ndsc/auth writes on every session create and reads on getUserSessions().
--
-- Run this against MAIN_DATABASE before updating AUTH_DATABASE_URL env vars.

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS app TEXT NOT NULL DEFAULT 'website';

CREATE INDEX IF NOT EXISTS idx_user_sessions_app
  ON public.user_sessions(app);
