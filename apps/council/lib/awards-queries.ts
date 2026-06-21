import { mainQuery } from "@/lib/main-db";
export { AWARD_TYPES, type AwardType } from "@/lib/award-constants";

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

async function awardsPlayerTextExpr(): Promise<string> {
  const res = await mainQuery<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'awards'
     AND column_name IN ('player_text', 'player')`
  );
  const col = res.rows[0]?.column_name;
  return col ? `a.${col}` : "null";
}

export async function getAwardsForYear(year: number): Promise<AwardRow[]> {
  const playerTextExpr = await awardsPlayerTextExpr();
  const res = await mainQuery<AwardRow>(
    `SELECT
       a.id::text,
       a.season_id::text,
       a.team_id::text,
       t.name AS team_name,
       a.player_id::text,
       p.display_name AS player_name,
       ${playerTextExpr} AS player_text,
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
  const playerTextExpr = await awardsPlayerTextExpr();
  const playerCol = playerTextExpr === "null" ? null : playerTextExpr.replace("a.", "");
  const colList = playerCol
    ? `season_id, team_id, player_id, ${playerCol}, award, notes`
    : "season_id, team_id, player_id, award, notes";
  const vals = playerCol
    ? [data.seasonId ?? null, data.teamId ?? null, data.playerId ?? null, data.playerText ?? null, data.award, data.notes ?? null]
    : [data.seasonId ?? null, data.teamId ?? null, data.playerId ?? null, data.award, data.notes ?? null];
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const res = await mainQuery<{ id: string }>(
    `INSERT INTO public.awards (${colList}) VALUES (${placeholders}) RETURNING id::text`,
    vals
  );
  return res.rows[0].id;
}

export async function deleteAward(id: string): Promise<void> {
  await mainQuery("DELETE FROM public.awards WHERE id=$1", [id]);
}
