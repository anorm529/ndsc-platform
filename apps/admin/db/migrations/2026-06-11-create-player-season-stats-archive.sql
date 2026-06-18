-- Historical/manual season totals for years where per-game data is unavailable.
-- Run once in the Neon SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.player_season_stats_archive (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  year integer not null,
  team text not null,
  player text not null,
  gender text,
  games_played numeric not null default 0,
  innings numeric not null default 0,
  rbis integer not null default 0,
  runs integer not null default 0,
  walks integer not null default 0,
  singles integer not null default 0,
  doubles integer not null default 0,
  triples integer not null default 0,
  home_runs integer not null default 0,
  batter_out integer not null default 0,
  at_bats integer not null default 0,
  uaos integer not null default 0,
  aos integer not null default 0,
  hits integer generated always as (singles + doubles + triples + home_runs) stored,
  total_bases integer generated always as (singles + doubles * 2 + triples * 3 + home_runs * 4) stored,
  avg numeric generated always as (
    round(((singles + doubles + triples + home_runs)::numeric / nullif(at_bats, 0)), 3)
  ) stored,
  slg numeric generated always as (
    round(((singles + doubles * 2 + triples * 3 + home_runs * 4)::numeric / nullif(at_bats, 0)), 3)
  ) stored,
  obp numeric generated always as (
    round((((singles + doubles + triples + home_runs + walks)::numeric) / nullif(at_bats + walks, 0)), 3)
  ) stored,
  ops numeric generated always as (
    round(
      (((singles + doubles + triples + home_runs + walks)::numeric) / nullif(at_bats + walks, 0)) +
      (((singles + doubles * 2 + triples * 3 + home_runs * 4)::numeric) / nullif(at_bats, 0)),
      3
    )
  ) stored,
  archived_by text not null default 'manual_upload',
  archived_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, team, player)
);

create index if not exists player_season_stats_archive_year_team_idx
  on public.player_season_stats_archive (year, team);
