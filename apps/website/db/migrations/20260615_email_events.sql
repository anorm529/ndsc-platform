create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  type text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists email_events_user_id_idx on public.email_events(user_id);
create index if not exists email_events_type_status_idx on public.email_events(type, status);
create index if not exists email_events_created_at_idx on public.email_events(created_at);
