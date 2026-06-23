-- Track Stripe payment link lifetime per player fee record.
-- Used to show "link expires in X days" in the treasurer UI and to
-- prevent season deletion when payment links are in flight.
ALTER TABLE player_fees
  ADD COLUMN stripe_link_sent_at    TIMESTAMPTZ,
  ADD COLUMN stripe_link_expires_at TIMESTAMPTZ;
