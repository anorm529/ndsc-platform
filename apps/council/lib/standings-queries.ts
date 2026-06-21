import { mainQuery } from "@/lib/main-db";

export interface StandingRow {
  id: string;
  team: string;
  division: string | null;
  year: number;
  wins: number;
  losses: number;
  runs_for: number;
  runs_against: number;
  points: number;
  difference: number;
  streak: string | null;
  position: number | null;
}

export async function getStandingsYears(): Promise<number[]> {
  const res = await mainQuery<{ year: number }>(
    "SELECT DISTINCT year FROM public.league_standings ORDER BY year DESC"
  );
  return res.rows.map((r) => r.year);
}

export async function getStandingsForYear(year: number): Promise<StandingRow[]> {
  const res = await mainQuery<StandingRow>(
    `SELECT id::text, team, division, year, wins, losses, runs_for, runs_against,
            coalesce(points, wins * 2) AS points,
            coalesce(difference, runs_for - runs_against) AS difference,
            streak, position
     FROM public.league_standings
     WHERE year = $1
     ORDER BY division NULLS LAST, coalesce(points, wins * 2) DESC, team`,
    [year]
  );
  return res.rows;
}

export async function getAllStandings(): Promise<StandingRow[]> {
  const res = await mainQuery<StandingRow>(
    `SELECT id::text, team, division, year, wins, losses, runs_for, runs_against,
            coalesce(points, wins * 2) AS points,
            coalesce(difference, runs_for - runs_against) AS difference,
            streak, position
     FROM public.league_standings
     ORDER BY year DESC, division NULLS LAST, coalesce(points, wins * 2) DESC, team`
  );
  return res.rows;
}

export async function createStanding(data: {
  team: string;
  year: number;
  division?: string | null;
  wins: number;
  losses: number;
  runs_for: number;
  runs_against: number;
  streak?: string | null;
  position?: number | null;
}): Promise<string> {
  const points = data.wins * 2;
  const difference = data.runs_for - data.runs_against;
  const res = await mainQuery<{ id: string }>(
    `INSERT INTO public.league_standings
       (team, year, division, wins, losses, runs_for, runs_against, points, difference, streak, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id::text`,
    [
      data.team,
      data.year,
      data.division ?? null,
      data.wins,
      data.losses,
      data.runs_for,
      data.runs_against,
      points,
      difference,
      data.streak ?? null,
      data.position ?? null,
    ]
  );
  return res.rows[0].id;
}

export async function updateStanding(
  id: string,
  data: {
    team: string;
    year: number;
    division?: string | null;
    wins: number;
    losses: number;
    runs_for: number;
    runs_against: number;
    streak?: string | null;
    position?: number | null;
  }
): Promise<void> {
  const points = data.wins * 2;
  const difference = data.runs_for - data.runs_against;
  await mainQuery(
    `UPDATE public.league_standings
     SET team=$1, year=$2, division=$3, wins=$4, losses=$5,
         runs_for=$6, runs_against=$7, points=$8, difference=$9,
         streak=$10, position=$11
     WHERE id=$12`,
    [
      data.team,
      data.year,
      data.division ?? null,
      data.wins,
      data.losses,
      data.runs_for,
      data.runs_against,
      points,
      difference,
      data.streak ?? null,
      data.position ?? null,
      id,
    ]
  );
}

export async function deleteStanding(id: string): Promise<void> {
  await mainQuery("DELETE FROM public.league_standings WHERE id=$1", [id]);
}
