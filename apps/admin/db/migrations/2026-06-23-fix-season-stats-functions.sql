-- Recreate refresh_player_season_stats and archive_player_season_stats with
-- correct column names. The previous versions referenced pss.rbi (does not exist)
-- instead of pss.rbis, and several other alias fallbacks for columns that never
-- existed in player_season_stats.

-- Aggregate per-game stats into the player_season_stats summary table.
-- Accepts optional year and team_slug filters; omit both to refresh everything.
CREATE OR REPLACE FUNCTION public.refresh_player_season_stats(
  p_year      integer DEFAULT NULL,
  p_team_slug text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.player_season_stats (
    player_id, season_id, team_id,
    games_played, innings,
    rbis, runs, walks,
    singles, doubles, triples, home_runs,
    batter_outs, at_bats, unassisted_outs, assisted_outs
  )
  SELECT
    pgs.player_id,
    g.season_id,
    g.team_id,
    count(*)::integer,
    coalesce(sum(pgs.innings), 0),
    coalesce(sum(pgs.rbis), 0)::integer,
    coalesce(sum(pgs.runs), 0)::integer,
    coalesce(sum(pgs.walks), 0)::integer,
    coalesce(sum(pgs.singles), 0)::integer,
    coalesce(sum(pgs.doubles), 0)::integer,
    coalesce(sum(pgs.triples), 0)::integer,
    coalesce(sum(pgs.home_runs), 0)::integer,
    coalesce(sum(pgs.batter_outs), 0)::integer,
    coalesce(sum(pgs.at_bats), 0)::integer,
    coalesce(sum(pgs.unassisted_outs), 0)::integer,
    coalesce(sum(pgs.assisted_outs), 0)::integer
  FROM public.player_game_stats pgs
  JOIN public.games   g ON g.id = pgs.game_id
  JOIN public.seasons s ON s.id = g.season_id
  JOIN public.teams   t ON t.id = g.team_id
  WHERE (p_year      IS NULL OR s.year = p_year)
    AND (p_team_slug IS NULL OR t.slug = p_team_slug)
  GROUP BY pgs.player_id, g.season_id, g.team_id
  ON CONFLICT (player_id, season_id, team_id) DO UPDATE SET
    games_played    = EXCLUDED.games_played,
    innings         = EXCLUDED.innings,
    rbis            = EXCLUDED.rbis,
    runs            = EXCLUDED.runs,
    walks           = EXCLUDED.walks,
    singles         = EXCLUDED.singles,
    doubles         = EXCLUDED.doubles,
    triples         = EXCLUDED.triples,
    home_runs       = EXCLUDED.home_runs,
    batter_outs     = EXCLUDED.batter_outs,
    at_bats         = EXCLUDED.at_bats,
    unassisted_outs = EXCLUDED.unassisted_outs,
    assisted_outs   = EXCLUDED.assisted_outs;
END;
$$;

-- Copy the season's summarised stats into the permanent archive table.
-- Maps column name differences between player_season_stats and
-- player_season_stats_archive (batter_out vs batter_outs, uaos/aos vs
-- unassisted_outs/assisted_outs).
--
-- NOTE: The original function returned integer and had DEFAULT 'admin'::text —
-- both preserved here to match the live DB signature exactly.
-- Use DROP FUNCTION first if recreating (return type cannot be changed in-place):
--   DROP FUNCTION public.archive_player_season_stats(integer, text);
CREATE OR REPLACE FUNCTION public.archive_player_season_stats(
  p_year        integer,
  p_archived_by text DEFAULT 'admin'::text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_archived_count integer;
BEGIN
  INSERT INTO public.player_season_stats_archive (
    season_id, team_id, player_id,
    year, team, player, gender,
    games_played, innings,
    rbis, runs, walks,
    singles, doubles, triples, home_runs,
    batter_out, at_bats, uaos, aos,
    archived_by, archived_at
  )
  SELECT
    pss.season_id,
    pss.team_id,
    pss.player_id,
    s.year,
    coalesce(t.slug, t.name, pss.team_id::text) AS team,
    coalesce(p.display_name, p.normalized_name, pss.player_id::text) AS player,
    p.gender,
    coalesce(pss.games_played, 0),
    coalesce(pss.innings, 0),
    coalesce(pss.rbis, 0),
    coalesce(pss.runs, 0),
    coalesce(pss.walks, 0),
    coalesce(pss.singles, 0),
    coalesce(pss.doubles, 0),
    coalesce(pss.triples, 0),
    coalesce(pss.home_runs, 0),
    coalesce(pss.batter_outs, 0),
    coalesce(pss.at_bats, 0),
    coalesce(pss.unassisted_outs, 0),
    coalesce(pss.assisted_outs, 0),
    p_archived_by,
    now()
  FROM public.player_season_stats pss
  JOIN public.seasons  s ON s.id = pss.season_id
  LEFT JOIN public.teams   t ON t.id = pss.team_id
  LEFT JOIN public.players p ON p.id = pss.player_id
  WHERE s.year = p_year
  ON CONFLICT (year, team, player) DO UPDATE SET
    season_id    = excluded.season_id,
    team_id      = excluded.team_id,
    player_id    = excluded.player_id,
    gender       = excluded.gender,
    games_played = excluded.games_played,
    innings      = excluded.innings,
    rbis         = excluded.rbis,
    runs         = excluded.runs,
    walks        = excluded.walks,
    singles      = excluded.singles,
    doubles      = excluded.doubles,
    triples      = excluded.triples,
    home_runs    = excluded.home_runs,
    batter_out   = excluded.batter_out,
    at_bats      = excluded.at_bats,
    uaos         = excluded.uaos,
    aos          = excluded.aos,
    archived_by  = excluded.archived_by,
    archived_at  = excluded.archived_at,
    updated_at   = now();

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  RETURN v_archived_count;
END;
$$;
