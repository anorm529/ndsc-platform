alter table public.player_profiles
  add column if not exists shirt_number integer;

alter table public.player_profiles
  drop constraint if exists player_profiles_shirt_number_check;

alter table public.player_profiles
  add constraint player_profiles_shirt_number_check
  check (shirt_number is null or (shirt_number >= 0 and shirt_number <= 99));
