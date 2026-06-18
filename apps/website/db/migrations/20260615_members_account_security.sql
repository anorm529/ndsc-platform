alter table public.users
  alter column account_status set default 'pending'::public.user_account_status;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens(user_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens(expires_at);

create table if not exists public.player_profiles (
  player_id uuid primary key references public.players(id) on delete cascade,
  position text,
  bats text,
  throws text,
  profile_image_url text,
  membership_status text not null default 'Active Member',
  member_since integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists player_profiles_set_updated_at on public.player_profiles;
create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();
