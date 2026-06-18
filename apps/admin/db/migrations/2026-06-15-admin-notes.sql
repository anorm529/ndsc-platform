-- Optional admin notes for account/player review context.

create table if not exists admin_notes (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  target_user_id uuid references users(id) on delete cascade,
  target_player_id uuid references players(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_target_user_idx
  on admin_notes (target_user_id, created_at desc);

create index if not exists admin_notes_actor_idx
  on admin_notes (actor_user_id, created_at desc);
