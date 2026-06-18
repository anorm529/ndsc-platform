-- Optional future audit log for admin account/profile actions.
-- Run when the portal is ready to persist change history.

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  target_user_id uuid references users(id) on delete set null,
  target_player_id uuid references players(id) on delete set null,
  action text not null,
  field_name text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on admin_audit_log (actor_user_id, created_at desc);

create index if not exists admin_audit_log_target_user_idx
  on admin_audit_log (target_user_id, created_at desc);

create index if not exists admin_audit_log_target_player_idx
  on admin_audit_log (target_player_id, created_at desc);
