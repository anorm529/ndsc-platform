-- Rate limiting table for auth endpoints (login, register, forgot-password).
-- Uses a fixed-window counter per key, reset when the window expires.

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key          TEXT PRIMARY KEY,
  attempts     INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window
  ON public.auth_rate_limits (window_start);
