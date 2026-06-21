import "server-only";
import { mainQuery } from "@/lib/main-db";

export interface GameRow {
  id: string;
  teamName: string;
  opponent: string;
  gameDate: string;
  homeAway: string;
  year: number;
  statRows: number;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  gamesCreated: number;
  unmatchedPlayers: string[];
  errors: string[];
}

export interface PreviewResult {
  totalRows: number;
  uniqueGames: number;
  existingGames: number;
  newGames: number;
  matchedPlayers: number;
  unmatchedPlayers: string[];
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function findPlayerId(name: string): Promise<string | null> {
  const result = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.players
     WHERE lower(trim(display_name)) = lower(trim($1))
        OR lower(trim(coalesce(normalized_name, ''))) = lower(trim($1))
     LIMIT 1`,
    [name],
  );
  return result.rows[0]?.id ?? null;
}

export async function findTeamId(name: string): Promise<string | null> {
  const result = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.teams
     WHERE lower(trim(name)) = lower(trim($1))
        OR lower(trim(slug)) = lower(trim($1))
     LIMIT 1`,
    [name],
  );
  return result.rows[0]?.id ?? null;
}

export async function findSeasonId(year: number): Promise<string | null> {
  const result = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.seasons WHERE year = $1 LIMIT 1`,
    [year],
  );
  return result.rows[0]?.id ?? null;
}

export async function findGameId(params: {
  seasonId: string;
  teamId: string;
  opponent: string;
  gameDate: string;
  homeAway?: string;
}): Promise<string | null> {
  const { seasonId, teamId, opponent, gameDate, homeAway } = params;
  const values: unknown[] = [seasonId, teamId, opponent.trim(), gameDate];
  const homeAwaySql = homeAway?.trim()
    ? `AND lower(trim(home_away::text)) = lower(trim($5))`
    : "";
  if (homeAway?.trim()) values.push(homeAway.trim());

  const result = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.games
     WHERE season_id = $1 AND team_id = $2
       AND lower(trim(opponent)) = lower(trim($3))
       AND game_date::date = $4::date
       ${homeAwaySql}
     LIMIT 1`,
    values,
  );
  return result.rows[0]?.id ?? null;
}

export async function findOrCreateGame(params: {
  seasonId: string;
  teamId: string;
  opponent: string;
  gameDate: string;
  homeAway: string;
}): Promise<{ id: string; created: boolean }> {
  const existing = await findGameId(params);
  if (existing) return { id: existing, created: false };

  const result = await mainQuery<{ id: string }>(
    `INSERT INTO public.games (team_id, season_id, opponent, game_date, home_away)
     VALUES ($1, $2, $3, $4::date, $5)
     RETURNING id::text AS id`,
    [params.teamId, params.seasonId, params.opponent, params.gameDate, params.homeAway || "home"],
  );
  return { id: result.rows[0].id, created: true };
}

// ─── Stat upsert ──────────────────────────────────────────────────────────────

function parseNum(v: string | undefined): number | null {
  if (v === undefined || v === null || v.trim() === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function normDate(v: string): string {
  const ukDate = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukDate) {
    const [, day, month, year] = ukDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return v.trim();
}

export interface StatRow {
  year: string;
  team: string;
  opponent: string;
  game_date: string;
  home_away: string;
  player: string;
  innings?: string;
  rbi?: string;
  runs?: string;
  bb?: string;
  "1b"?: string;
  "2b"?: string;
  "3b"?: string;
  hr?: string;
  batter_outs?: string;
  ab?: string;
  unassisted_outs?: string;
  assisted_outs?: string;
  [key: string]: string | undefined;
}

export async function upsertStatRow(
  gameId: string,
  playerId: string,
  row: StatRow,
): Promise<"inserted" | "updated"> {
  const innings = parseNum(row.innings);
  const rbis = parseNum(row.rbi);
  const runs = parseNum(row.runs);
  const walks = parseNum(row.bb);
  const singles = parseNum(row["1b"]);
  const doubles = parseNum(row["2b"]);
  const triples = parseNum(row["3b"]);
  const homeRuns = parseNum(row.hr);
  const batterOuts = parseNum(row.batter_outs);
  const atBats = parseNum(row.ab);
  const unassistedOuts = parseNum(row.unassisted_outs);
  const assistedOuts = parseNum(row.assisted_outs);

  const totalOuts =
    unassistedOuts !== null && assistedOuts !== null
      ? unassistedOuts + assistedOuts
      : unassistedOuts ?? assistedOuts;

  const totalOnBase =
    (singles ?? 0) + (doubles ?? 0) + (triples ?? 0) + (homeRuns ?? 0) + (walks ?? 0);

  const obp = atBats ? totalOnBase / atBats : null;
  const slg = atBats
    ? ((singles ?? 0) + 2 * (doubles ?? 0) + 3 * (triples ?? 0) + 4 * (homeRuns ?? 0)) / atBats
    : null;
  const ops = obp !== null && slg !== null ? obp + slg : null;

  // Check if already exists
  const existing = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.player_game_stats
     WHERE game_id = $1 AND player_id = $2 LIMIT 1`,
    [gameId, playerId],
  );

  if (existing.rows.length > 0) {
    await mainQuery(
      `UPDATE public.player_game_stats SET
        innings = $3, rbis = $4, runs = $5, walks = $6,
        singles = $7, doubles = $8, triples = $9, home_runs = $10,
        batter_outs = $11, at_bats = $12, unassisted_outs = $13, assisted_outs = $14,
        total_outs = $15, total_on_base = $16, obp = $17, slg = $18, ops = $19
       WHERE game_id = $1 AND player_id = $2`,
      [
        gameId, playerId,
        innings, rbis, runs, walks,
        singles, doubles, triples, homeRuns,
        batterOuts, atBats, unassistedOuts, assistedOuts,
        totalOuts, totalOnBase, obp, slg, ops,
      ],
    );
    return "updated";
  }

  await mainQuery(
    `INSERT INTO public.player_game_stats
      (game_id, player_id, innings, rbis, runs, walks,
       singles, doubles, triples, home_runs,
       batter_outs, at_bats, unassisted_outs, assisted_outs,
       total_outs, total_on_base, obp, slg, ops)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      gameId, playerId,
      innings, rbis, runs, walks,
      singles, doubles, triples, homeRuns,
      batterOuts, atBats, unassistedOuts, assistedOuts,
      totalOuts, totalOnBase, obp, slg, ops,
    ],
  );
  return "inserted";
}

// ─── Recent games ─────────────────────────────────────────────────────────────

export async function getRecentGamesWithStats(limit = 20): Promise<GameRow[]> {
  const result = await mainQuery<{
    id: string;
    team_name: string;
    opponent: string;
    game_date: string;
    home_away: string;
    year: number;
    stat_rows: number;
  }>(
    `SELECT g.id::text AS id, t.name AS team_name, g.opponent, g.game_date::text,
            g.home_away, s.year, count(pgs.id)::int AS stat_rows
     FROM public.games g
     JOIN public.teams t ON t.id = g.team_id
     JOIN public.seasons s ON s.id = g.season_id
     LEFT JOIN public.player_game_stats pgs ON pgs.game_id = g.id
     GROUP BY g.id, t.name, g.opponent, g.game_date, g.home_away, s.year
     ORDER BY g.game_date DESC, t.name
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((r) => ({
    id: r.id,
    teamName: r.team_name,
    opponent: r.opponent,
    gameDate: r.game_date,
    homeAway: r.home_away,
    year: r.year,
    statRows: r.stat_rows,
  }));
}

// ─── CSV processing ───────────────────────────────────────────────────────────

export function parseCsvText(text: string): StatRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = values[i] ?? "";
      }
      return row as StatRow;
    });
}

export async function previewCsvImport(rows: StatRow[]): Promise<PreviewResult> {
  const gameKeys = new Set<string>();
  const playerNames = new Set<string>();

  for (const row of rows) {
    const key = `${row.year}::${row.team}::${row.opponent}::${row.game_date}::${row.home_away}`;
    gameKeys.add(key);
    if (row.player?.trim()) playerNames.add(row.player.trim());
  }

  // Check games
  let existingGames = 0;
  let newGames = 0;

  for (const key of gameKeys) {
    const [year, team, opponent, gameDate, homeAway] = key.split("::");
    const teamId = await findTeamId(team);
    const seasonId = await findSeasonId(parseInt(year, 10));
    if (!teamId || !seasonId) { newGames++; continue; }
    const existing = await findGameId({ seasonId, teamId, opponent, gameDate: normDate(gameDate), homeAway });
    if (existing) existingGames++; else newGames++;
  }

  // Check players
  const unmatchedPlayers: string[] = [];
  let matchedPlayers = 0;

  for (const name of playerNames) {
    const id = await findPlayerId(name);
    if (id) matchedPlayers++;
    else unmatchedPlayers.push(name);
  }

  return {
    totalRows: rows.length,
    uniqueGames: gameKeys.size,
    existingGames,
    newGames,
    matchedPlayers,
    unmatchedPlayers,
  };
}

export async function importCsvRows(rows: StatRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    gamesCreated: 0,
    unmatchedPlayers: [],
    errors: [],
  };

  // Cache lookups to avoid hammering the DB
  const teamCache = new Map<string, string | null>();
  const seasonCache = new Map<number, string | null>();
  const playerCache = new Map<string, string | null>();
  const gameCache = new Map<string, string>();

  for (const row of rows) {
    const playerName = row.player?.trim();
    if (!playerName) { result.skipped++; continue; }

    // Resolve team
    const teamKey = row.team?.trim().toLowerCase();
    if (!teamCache.has(teamKey)) teamCache.set(teamKey, await findTeamId(row.team));
    const teamId = teamCache.get(teamKey);
    if (!teamId) {
      result.errors.push(`Unknown team: ${row.team}`);
      result.skipped++;
      continue;
    }

    // Resolve season
    const year = parseInt(row.year, 10);
    if (!seasonCache.has(year)) seasonCache.set(year, await findSeasonId(year));
    const seasonId = seasonCache.get(year);
    if (!seasonId) {
      result.errors.push(`No season found for year: ${year}`);
      result.skipped++;
      continue;
    }

    // Resolve or create game
    const gameDate = normDate(row.game_date);
    const gameKey = `${seasonId}::${teamId}::${row.opponent}::${gameDate}::${row.home_away}`;
    if (!gameCache.has(gameKey)) {
      const { id, created } = await findOrCreateGame({
        seasonId, teamId,
        opponent: row.opponent,
        gameDate,
        homeAway: row.home_away || "home",
      });
      gameCache.set(gameKey, id);
      if (created) result.gamesCreated++;
    }
    const gameId = gameCache.get(gameKey)!;

    // Resolve player
    const playerKey = playerName.toLowerCase();
    if (!playerCache.has(playerKey)) playerCache.set(playerKey, await findPlayerId(playerName));
    const playerId = playerCache.get(playerKey);

    if (!playerId) {
      if (!result.unmatchedPlayers.includes(playerName)) {
        result.unmatchedPlayers.push(playerName);
      }
      result.skipped++;
      continue;
    }

    try {
      const outcome = await upsertStatRow(gameId, playerId, row);
      if (outcome === "inserted") result.inserted++;
      else result.updated++;
    } catch (err) {
      result.errors.push(`Row error for ${playerName}: ${String(err)}`);
      result.skipped++;
    }
  }

  // Deduplicate errors
  result.errors = [...new Set(result.errors)];
  return result;
}
