-- Allow recorded_by to be NULL for system-generated payments (e.g. Stripe webhooks)
-- where there is no human actor to attribute the payment to.
ALTER TABLE fee_payments ALTER COLUMN recorded_by DROP NOT NULL;
