-- Add status column to meeting_attendees for richer attendance tracking
-- (present / absent / apologies alongside the legacy attended boolean)
ALTER TABLE meeting_attendees
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('present', 'absent', 'apologies'));
