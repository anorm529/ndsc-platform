create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('player', 'admin', 'owner');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_account_status as enum ('active', 'pending', 'disabled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role public.user_role not null default 'player',
  player_id uuid references public.players(id) on delete set null,
  email_verified boolean not null default false,
  account_status public.user_account_status not null default 'active',
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  device_name text,
  ip_address inet
);

create index if not exists users_player_id_idx on public.users(player_id);
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists user_sessions_expires_at_idx on public.user_sessions(expires_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();
