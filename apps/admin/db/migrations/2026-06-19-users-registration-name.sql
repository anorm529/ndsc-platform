-- Store the name a user typed at registration so admins can identify
-- which existing player record to link without needing to create duplicates.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS registration_name TEXT;
