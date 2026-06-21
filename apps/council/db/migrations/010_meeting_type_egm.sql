-- Migration 010: Add EGM to council_meetings type constraint
-- Run against: COUNCIL_DATABASE_URL

ALTER TABLE council_meetings DROP CONSTRAINT IF EXISTS council_meetings_type_check;
ALTER TABLE council_meetings ADD CONSTRAINT council_meetings_type_check
  CHECK (type IN ('agm', 'council', 'committee', 'egm'));
