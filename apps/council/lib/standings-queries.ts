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

// ── schema probing ────────────────────────────────────────────────────────────

interface ColInfo {
  name: string;
  generated: boolean;
}

interface SCols {
  id: string;
  team: string;
  division: string;
  yearExpr: string;
  yearWriteCol: string | null;
  needsSeasonJoin: boolean;
  wins: string;
  losses: string;
  runsFor: string;
  runsAgainst: string;
  pointsExpr: string;
  differenceExpr: string;
  streak: string;
  positionExpr: string;
}

let rawColsCache: ColInfo[] | null = null;

async function getRawCols(): Promise<ColInfo[]> {
  if (rawColsCache) return rawColsCache;
  const res = await mainQuery<{ column_name: string; is_generated: string }>(
    `SELECT column_name, is_generated
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'league_standings'`
  );
  rawColsCache = res.rows.map((r) => ({
    name: r.column_name,
    generated: r.is_generated !== "NEVER",
  }));
  return rawColsCache;
}

function qi(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function pickCol(cols: ColInfo[], candidates: string[]): ColInfo | null {
  for (const c of candidates) {
    const found = cols.find((col) => col.name === c);
    if (found) return found;
  }
  return null;
}

function pickExpr(cols: ColInfo[], candidates: string[], fallback: string): string {
  const found = pickCol(cols, candidates);
  return found ? qi(found.name) : fallback;
}

let sColsCache: SCols | null = null;

async function getCols(): Promise<SCols> {
  if (sColsCache) return sColsCache;
  const cols = await getRawCols();
  const names = new Set(cols.map((c) => c.name));

  const hasYear = names.has("year") || names.has("Year");
  const yearColInfo = pickCol(cols, ["year", "Year"]);
  const hasSeasonId = names.has("season_id");

  const winsExpr = pickExpr(cols, ["wins", "win", "Win"], "0");
  const runsForExpr = pickExpr(cols, ["runs_for", "runs_scored", "Runs Scored"], "0");
  const runsAgainstExpr = pickExpr(cols, ["runs_against", "runs_allowed", "runs_awarded", "Runs Awarded"], "0");

  const pointsCol = pickCol(cols, ["points", "Points"]);
  const diffCol = pickCol(cols, ["difference", "run_difference", "Difference"]);

  sColsCache = {
    id: pickCol(cols, ["id"])?.name ?? "id",
    team: pickExpr(cols, ["team_name", "team", "Team"], "'Unknown'"),
    division: pickExpr(cols, ["division", "Division"], "null"),
    yearExpr: hasYear ? qi(yearColInfo!.name) : hasSeasonId ? "s.year" : "null",
    yearWriteCol: yearColInfo?.name ?? null,
    needsSeasonJoin: !hasYear && hasSeasonId,
    wins: winsExpr,
    losses: pickExpr(cols, ["losses", "loss", "Loss"], "0"),
    runsFor: runsForExpr,
    runsAgainst: runsAgainstExpr,
    pointsExpr: pointsCol ? qi(pointsCol.name) : `(${winsExpr} * 2)`,
    differenceExpr: diffCol ? qi(diffCol.name) : `(${runsForExpr} - ${runsAgainstExpr})`,
    streak: pickExpr(cols, ["streak", "Streak"], "null"),
    positionExpr: pickExpr(cols, ["position", "Position"], "null"),
  };

  return sColsCache;
}

function seasonJoin(c: SCols): string {
  return c.needsSeasonJoin
    ? "LEFT JOIN public.seasons s ON s.id = league_standings.season_id"
    : "";
}

function selectCols(c: SCols): string {
  return `
    league_standings.${qi(c.id)}::text AS id,
    ${c.team} AS team,
    ${c.division} AS division,
    ${c.yearExpr} AS year,
    ${c.wins} AS wins,
    ${c.losses} AS losses,
    ${c.runsFor} AS runs_for,
    ${c.runsAgainst} AS runs_against,
    coalesce(${c.pointsExpr}, 0) AS points,
    coalesce(${c.differenceExpr}, 0) AS difference,
    ${c.streak} AS streak,
    ${c.positionExpr} AS position
  `;
}

// ── public queries ────────────────────────────────────────────────────────────

export async function getStandingsYears(): Promise<number[]> {
  const c = await getCols();
  const res = await mainQuery<{ year: number }>(
    `SELECT DISTINCT ${c.yearExpr} AS year
     FROM public.league_standings
     ${seasonJoin(c)}
     ORDER BY year DESC`
  );
  return res.rows.map((r) => r.year);
}

export async function getStandingsForYear(year: number): Promise<StandingRow[]> {
  const c = await getCols();
  const res = await mainQuery<StandingRow>(
    `SELECT ${selectCols(c)}
     FROM public.league_standings
     ${seasonJoin(c)}
     WHERE ${c.yearExpr} = $1
     ORDER BY ${c.division} NULLS LAST, points DESC, team`,
    [year]
  );
  return res.rows;
}

export async function getAllStandings(): Promise<StandingRow[]> {
  const c = await getCols();
  const res = await mainQuery<StandingRow>(
    `SELECT ${selectCols(c)}
     FROM public.league_standings
     ${seasonJoin(c)}
     ORDER BY year DESC, ${c.division} NULLS LAST, points DESC, team`
  );
  return res.rows;
}

// ── write helpers ─────────────────────────────────────────────────────────────

async function resolveYearWrite(
  c: SCols,
  year: number
): Promise<{ col: string; val: unknown }> {
  if (c.yearWriteCol) return { col: c.yearWriteCol, val: year };
  if (c.needsSeasonJoin) {
    const sr = await mainQuery<{ id: string }>(
      "SELECT id::text FROM public.seasons WHERE year = $1 LIMIT 1",
      [year]
    );
    return { col: "season_id", val: sr.rows[0]?.id ?? null };
  }
  return { col: "year", val: year };
}

export async function createStanding(data: {
  team: string;
  year: number;
  division?: string | null;
  wins: number;
  losses: number;
  points?: number;
  runs_for: number;
  runs_against: number;
  streak?: string | null;
  position?: number | null;
}): Promise<string> {
  const c = await getCols();
  const cols = await getRawCols();
  const notGenerated = new Set(cols.filter((c) => !c.generated).map((c) => c.name));

  const { col: yearCol, val: yearVal } = await resolveYearWrite(c, data.year);

  const colNames: string[] = [];
  const vals: unknown[] = [];

  function add(candidates: string[], val: unknown) {
    const found = pickCol(cols, candidates);
    if (!found) return;
    if (!notGenerated.has(found.name)) return; // skip generated columns
    colNames.push(qi(found.name));
    vals.push(val);
  }

  add(["team_name", "team", "Team"], data.team);
  // year column
  if (notGenerated.has(yearCol)) {
    colNames.push(qi(yearCol));
    vals.push(yearVal);
  }
  add(["division", "Division"], data.division ?? null);
  add(["wins", "win", "Win"], data.wins);
  add(["losses", "loss", "Loss"], data.losses);
  add(["runs_for", "runs_scored", "Runs Scored"], data.runs_for);
  add(["runs_against", "runs_allowed", "runs_awarded", "Runs Awarded"], data.runs_against);
  add(["points", "Points"], data.points ?? data.wins * 2);
  add(["difference", "run_difference", "Difference"], data.runs_for - data.runs_against);
  add(["streak", "Streak"], data.streak ?? null);
  add(["position", "Position"], data.position ?? null);

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const res = await mainQuery<{ id: string }>(
    `INSERT INTO public.league_standings (${colNames.join(", ")}) VALUES (${placeholders}) RETURNING league_standings.id::text`,
    vals
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
    points?: number;
    runs_for: number;
    runs_against: number;
    streak?: string | null;
    position?: number | null;
  }
): Promise<void> {
  const c = await getCols();
  const cols = await getRawCols();
  const notGenerated = new Set(cols.filter((c) => !c.generated).map((c) => c.name));

  const { col: yearCol, val: yearVal } = await resolveYearWrite(c, data.year);

  const sets: string[] = [];
  const vals: unknown[] = [];

  function add(candidates: string[], val: unknown) {
    const found = pickCol(cols, candidates);
    if (!found) return;
    if (!notGenerated.has(found.name)) return; // skip generated columns
    vals.push(val);
    sets.push(`${qi(found.name)} = $${vals.length}`);
  }

  add(["team_name", "team", "Team"], data.team);
  if (notGenerated.has(yearCol)) {
    vals.push(yearVal);
    sets.push(`${qi(yearCol)} = $${vals.length}`);
  }
  add(["division", "Division"], data.division ?? null);
  add(["wins", "win", "Win"], data.wins);
  add(["losses", "loss", "Loss"], data.losses);
  add(["runs_for", "runs_scored", "Runs Scored"], data.runs_for);
  add(["runs_against", "runs_allowed", "runs_awarded", "Runs Awarded"], data.runs_against);
  add(["points", "Points"], data.points ?? data.wins * 2);
  add(["difference", "run_difference", "Difference"], data.runs_for - data.runs_against);
  add(["streak", "Streak"], data.streak ?? null);
  add(["position", "Position"], data.position ?? null);

  vals.push(id);
  await mainQuery(
    `UPDATE public.league_standings SET ${sets.join(", ")}
     WHERE league_standings.${qi(c.id)} = $${vals.length}`,
    vals
  );
}

export async function deleteStanding(id: string): Promise<void> {
  const c = await getCols();
  await mainQuery(
    `DELETE FROM public.league_standings WHERE league_standings.${qi(c.id)} = $1`,
    [id]
  );
}
