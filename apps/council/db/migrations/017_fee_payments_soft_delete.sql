-- Soft-delete columns for fee_payments.
-- Voiding a payment keeps the audit trail intact; it is excluded from
-- amount_paid calculations but remains visible in the fee history page.
ALTER TABLE fee_payments
  ADD COLUMN voided_at   TIMESTAMPTZ,
  ADD COLUMN voided_by   TEXT,
  ADD COLUMN void_reason TEXT;
