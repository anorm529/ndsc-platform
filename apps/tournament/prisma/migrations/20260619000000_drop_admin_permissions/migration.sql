-- Permissions have moved to app_permissions in the shared auth/main DB.
-- Drop the tournament-local admin_permissions table.
DROP TABLE IF EXISTS admin_permissions;
