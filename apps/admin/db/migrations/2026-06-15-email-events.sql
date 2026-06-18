-- Email delivery events for password resets and future member emails.

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email text not null,
  type text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists email_events_user_idx
  on email_events (user_id, created_at desc);

create index if not exists email_events_type_status_idx
  on email_events (type, status, created_at desc);

create index if not exists email_events_created_idx
  on email_events (created_at desc);
