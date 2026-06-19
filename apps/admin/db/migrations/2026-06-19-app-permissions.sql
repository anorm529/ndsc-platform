-- Unified per-app permission grants.
-- Replaces the tournament app's local admin_permissions table.
-- Each row grants a user one permission within one app.
-- app:        'admin' | 'tournament' | 'fantasy'
-- permission: app-specific string (see packages/auth/src/permissions.ts)

CREATE TABLE IF NOT EXISTS app_permissions (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app         TEXT        NOT NULL,
  permission  TEXT        NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID        REFERENCES users(id) ON DELETE SET NULL,

  PRIMARY KEY (user_id, app, permission)
);

CREATE INDEX IF NOT EXISTS idx_app_permissions_user_id ON app_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_permissions_app     ON app_permissions(app);
