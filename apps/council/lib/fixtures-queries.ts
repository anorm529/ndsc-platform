import "server-only";
import { mainQuery } from "@/lib/main-db";

export interface FixtureRow {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  seasonId: string;
  seasonYear: number;
  opponent: string;
  scheduledAt: string | null;
  gameDate: string;
  homeAway: string;
  location: string | null;
  runsFor: number | null;
  runsAgainst: number | null;
  status: string | null;
  result: string | null;
}

export async function getFixturesForSeason(seasonId: string): Promise<FixtureRow[]> {
  const result = await mainQuery<{
    id: string;
    team_id: string;
    team_name: string;
    team_slug: string;
    season_id: string;
    season_year: number;
    opponent: string;
    scheduled_at: string | null;
    game_date: string;
    home_away: string;
    location: string | null;
    runs_for: number | null;
    runs_against: number | null;
    status: string | null;
    result: string | null;
  }>(
    `SELECT g.id::text, g.team_id::text, t.name AS team_name, t.slug AS team_slug,
            g.season_id::text, s.year AS season_year,
            g.opponent, g.scheduled_at::text, g.game_date::text,
            g.home_away, g.location,
            g.runs_for, g.runs_against, g.status, g.result
     FROM public.games g
     JOIN public.teams t ON t.id = g.team_id
     JOIN public.seasons s ON s.id = g.season_id
     WHERE g.season_id = $1
     ORDER BY COALESCE(g.scheduled_at, g.game_date::timestamp) ASC, t.name ASC`,
    [seasonId],
  );

  return result.rows.map((r) => ({
    id: r.id,
    teamId: r.team_id,
    teamName: r.team_name,
    teamSlug: r.team_slug,
    seasonId: r.season_id,
    seasonYear: r.season_year,
    opponent: r.opponent,
    scheduledAt: r.scheduled_at,
    gameDate: r.game_date,
    homeAway: r.home_away,
    location: r.location,
    runsFor: r.runs_for,
    runsAgainst: r.runs_against,
    status: r.status,
    result: r.result,
  }));
}

export async function createFixture(data: {
  teamId: string;
  seasonId: string;
  opponent: string;
  scheduledAt: string;
  homeAway: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<string> {
  // Extract the date portion directly from the input string to avoid timezone-shifting game_date.
  // datetime-local inputs give "YYYY-MM-DDTHH:MM" in local time; $4::date on a timestamptz
  // would shift to UTC and could move the date back by a day for UTC+ timezones.
  const gameDate = data.scheduledAt.slice(0, 10);
  const result = await mainQuery<{ id: string }>(
    `INSERT INTO public.games (team_id, season_id, opponent, scheduled_at, game_date, home_away, location, latitude, longitude)
     VALUES ($1, $2, $3, $4::timestamptz, $5::date, $6, $7, $8, $9)
     RETURNING id::text`,
    [data.teamId, data.seasonId, data.opponent, data.scheduledAt, gameDate, data.homeAway, data.location ?? null, data.latitude ?? null, data.longitude ?? null],
  );
  return result.rows[0].id;
}

export async function updateFixtureResult(data: {
  id: string;
  runsFor: number;
  runsAgainst: number;
}): Promise<void> {
  await mainQuery(
    `UPDATE public.games
     SET runs_for = $2, runs_against = $3, status = 'Completed'
     WHERE id = $1`,
    [data.id, data.runsFor, data.runsAgainst],
  );
}

export async function updateFixtureDetails(data: {
  id: string;
  opponent: string;
  scheduledAt: string;
  homeAway: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<void> {
  const gameDate = data.scheduledAt.slice(0, 10);
  await mainQuery(
    `UPDATE public.games
     SET opponent = $2, scheduled_at = $3::timestamptz, game_date = $4::date,
         home_away = $5, location = $6, latitude = $7, longitude = $8
     WHERE id = $1`,
    [data.id, data.opponent, data.scheduledAt, gameDate, data.homeAway, data.location ?? null, data.latitude ?? null, data.longitude ?? null],
  );
}

export async function deleteFixture(id: string): Promise<void> {
  await mainQuery(`DELETE FROM public.games WHERE id = $1`, [id]);
}

export function deriveResult(runsFor: number | null, runsAgainst: number | null, explicitResult: string | null, status: string | null): "W" | "L" | "D" | null {
  if (explicitResult && ["W", "L", "D"].includes(explicitResult.toUpperCase())) {
    return explicitResult.toUpperCase() as "W" | "L" | "D";
  }
  const completed = ["completed", "played", "final", "finished"].includes((status ?? "").toLowerCase());
  if (!completed || runsFor === null || runsAgainst === null) return null;
  if (runsFor > runsAgainst) return "W";
  if (runsFor < runsAgainst) return "L";
  return "D";
}
