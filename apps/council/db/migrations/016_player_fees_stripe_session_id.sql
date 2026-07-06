-- Store the Stripe checkout session ID so the system can expire/cancel
-- a stale payment link before creating a new one for the same player fee.
ALTER TABLE player_fees ADD COLUMN stripe_session_id TEXT;
