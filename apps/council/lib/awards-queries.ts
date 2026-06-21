import { mainQuery } from "@/lib/main-db";

export const AWARD_TYPES = [
  "Male MVP",
  "Female MVP",
  "Spirit Award",
  "Golden Glove",
  "Captains Choice",
  "Rookie",
] as const;

export type AwardType = (typeof AWARD_TYPES)[number];

export interface AwardRow {
  id: string;
  season_id: string | null;
  team_id: string | null;
  team_name: string | null;
  player_id: string | null;
  player_name: string | null;
  player_text: string | null;
  award: string;
  notes: string | null;
  year: number | null;
}

export async function getAwardYears(): Promise<number[]> {
  const res = await mainQuery<{ year: number }>(
    `SELECT DISTINCT coalesce(s.year, extract(year from a.created_at)::int) AS year
     FROM public.awards a
     LEFT JOIN public.seasons s ON s.id = a.season_id
     ORDER BY year DESC`
  );
  return res.rows.map((r) => r.year);
}

export async function getAwardsForYear(year: number): Promise<AwardRow[]> {
  const res = await mainQuery<AwardRow>(
    `SELECT
       a.id::text,
       a.season_id::text,
       a.team_id::text,
       t.name AS team_name,
       a.player_id::text,
       p.display_name AS player_name,
       a.player_text,
       a.award,
       a.notes,
       coalesce(s.year, extract(year from a.created_at)::int) AS year
     FROM public.awards a
     LEFT JOIN public.seasons s ON s.id = a.season_id
     LEFT JOIN public.teams t ON t.id = a.team_id
     LEFT JOIN public.players p ON p.id = a.player_id
     WHERE coalesce(s.year, extract(year from a.created_at)::int) = $1
     ORDER BY t.name NULLS LAST, a.award`,
    [year]
  );
  return res.rows;
}

export async function createAward(data: {
  seasonId?: string | null;
  teamId?: string | null;
  playerId?: string | null;
  playerText?: string | null;
  award: string;
  notes?: string | null;
}): Promise<string> {
  const res = await mainQuery<{ id: string }>(
    `INSERT INTO public.awards (season_id, team_id, player_id, player_text, award, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::text`,
    [
      data.seasonId ?? null,
      data.teamId ?? null,
      data.playerId ?? null,
      data.playerText ?? null,
      data.award,
      data.notes ?? null,
    ]
  );
  return res.rows[0].id;
}

export async function deleteAward(id: string): Promise<void> {
  await mainQuery("DELETE FROM public.awards WHERE id=$1", [id]);
}
