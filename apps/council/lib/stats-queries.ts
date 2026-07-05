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
  unmatchedPlayers: string[];
  unmatchedGames: string[];
  notOnRoster: string[];
  errors: string[];
}

export interface PreviewResult {
  totalRows: number;
  uniqueGames: number;
  matchedGames: number;
  unmatchedGames: string[];
  matchedPlayers: number;
  unmatchedPlayers: string[];
  notOnRosterPlayers: string[];
  enrollmentChecked: boolean;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function findPlayerId(name: string): Promise<string | null> {
  const result = await mainQuery<{ id: string }>(
    `SELECT id::text AS id FROM public.players
     WHERE active = true
       AND (lower(trim(display_name)) = lower(trim($1))
         OR lower(trim(coalesce(normalized_name, ''))) = lower(trim($1)))
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
       AND game_date BETWEEN ($4::date - 1) AND ($4::date + 1)
       ${homeAwaySql}
     LIMIT 1`,
    values,
  );
  return result.rows[0]?.id ?? null;
}

export async function findMatchingGame(params: {
  seasonId: string;
  teamId: string;
  opponent: string;
  gameDate: string;
  homeAway?: string;
}): Promise<string | null> {
  return findGameId(params);
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
  const innings = parseNum(row.innings); // nullable — not all players have an innings count
  // Counting stats default to 0 when blank — these columns are NOT NULL in the schema
  const rbis = parseNum(row.rbi) ?? 0;
  const runs = parseNum(row.runs) ?? 0;
  const walks = parseNum(row.bb) ?? 0;
  const singles = parseNum(row["1b"]) ?? 0;
  const doubles = parseNum(row["2b"]) ?? 0;
  const triples = parseNum(row["3b"]) ?? 0;
  const homeRuns = parseNum(row.hr) ?? 0;
  const batterOuts = parseNum(row.batter_outs) ?? 0;
  const atBats = parseNum(row.ab) ?? 0;
  const unassistedOuts = parseNum(row.unassisted_outs) ?? 0;
  const assistedOuts = parseNum(row.assisted_outs) ?? 0;

  // total_outs, total_on_base, obp, slg, ops are generated columns — Postgres computes them automatically.

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
        batter_outs = $11, at_bats = $12, unassisted_outs = $13, assisted_outs = $14
       WHERE game_id = $1 AND player_id = $2`,
      [
        gameId, playerId,
        innings, rbis, runs, walks,
        singles, doubles, triples, homeRuns,
        batterOuts, atBats, unassistedOuts, assistedOuts,
      ],
    );
    return "updated";
  }

  await mainQuery(
    `INSERT INTO public.player_game_stats
      (game_id, player_id, innings, rbis, runs, walks,
       singles, doubles, triples, home_runs,
       batter_outs, at_bats, unassisted_outs, assisted_outs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      gameId, playerId,
      innings, rbis, runs, walks,
      singles, doubles, triples, homeRuns,
      batterOuts, atBats, unassistedOuts, assistedOuts,
    ],
  );
  return "inserted";
}

export async function getActiveSeasonId(): Promise<string | null> {
  const result = await mainQuery<{ id: string }>(
    `SELECT id::text FROM public.seasons WHERE status = 'active' ORDER BY year DESC LIMIT 1`,
    [],
  );
  return result.rows[0]?.id ?? null;
}

// Returns map of player_id → current_team_id (null if unassigned) for every enrolled player in the season.
export async function getAllEnrollmentsForSeason(seasonId: string): Promise<Map<string, string | null>> {
  const result = await mainQuery<{ player_id: string; current_team_id: string | null }>(
    `SELECT player_id::text, current_team_id::text
     FROM public.season_enrollments
     WHERE season_id = $1`,
    [seasonId],
  );
  return new Map(result.rows.map((r) => [r.player_id, r.current_team_id ?? null]));
}

// ─── Recent games ─────────────────────────────────────────────────────────────

export async function getRecentGamesWithStats(limit = 20, seasonId?: string): Promise<GameRow[]> {
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
     WHERE ($2::uuid IS NULL OR g.season_id = $2::uuid)
     GROUP BY g.id, t.name, g.opponent, g.game_date, g.home_away, s.year
     ORDER BY g.game_date DESC, t.name
     LIMIT $1`,
    [limit, seasonId ?? null],
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

// ─── Game drill-down ──────────────────────────────────────────────────────────

export interface GameDetail {
  id: string;
  teamName: string;
  opponent: string;
  gameDate: string;
  homeAway: string;
  year: number;
}

export interface StatRecord {
  id: string;
  playerId: string;
  playerName: string;
  innings: number | null;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  runs: number;
  walks: number;
  batterOuts: number;
  atBats: number;
  unassistedOuts: number;
  assistedOuts: number;
}

export async function getGameById(gameId: string): Promise<GameDetail | null> {
  const result = await mainQuery<{
    id: string; team_name: string; opponent: string;
    game_date: string; home_away: string; year: number;
  }>(
    `SELECT g.id::text AS id, t.name AS team_name, g.opponent,
            g.game_date::text, g.home_away, s.year
     FROM games g
     JOIN teams t ON t.id = g.team_id
     JOIN seasons s ON s.id = g.season_id
     WHERE g.id = $1`,
    [gameId]
  );
  const r = result.rows[0];
  if (!r) return null;
  return { id: r.id, teamName: r.team_name, opponent: r.opponent, gameDate: r.game_date, homeAway: r.home_away, year: r.year };
}

export async function getGameStatRecords(gameId: string): Promise<StatRecord[]> {
  const result = await mainQuery<{
    id: string; player_id: string; player_name: string;
    innings: number | null; singles: number; doubles: number; triples: number;
    home_runs: number; rbis: number; runs: number; walks: number;
    batter_outs: number; at_bats: number; unassisted_outs: number; assisted_outs: number;
  }>(
    `SELECT pgs.id::text AS id, pgs.player_id::text AS player_id,
            coalesce(p.display_name, 'Unknown') AS player_name,
            pgs.innings, pgs.singles, pgs.doubles, pgs.triples,
            pgs.home_runs, pgs.rbis, pgs.runs, pgs.walks,
            pgs.batter_outs, pgs.at_bats, pgs.unassisted_outs, pgs.assisted_outs
     FROM player_game_stats pgs
     JOIN players p ON p.id = pgs.player_id
     WHERE pgs.game_id = $1
     ORDER BY p.display_name ASC`,
    [gameId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    playerId: r.player_id,
    playerName: r.player_name,
    innings: r.innings,
    singles: r.singles,
    doubles: r.doubles,
    triples: r.triples,
    homeRuns: r.home_runs,
    rbis: r.rbis,
    runs: r.runs,
    walks: r.walks,
    batterOuts: r.batter_outs,
    atBats: r.at_bats,
    unassistedOuts: r.unassisted_outs,
    assistedOuts: r.assisted_outs,
  }));
}

// ─── CSV processing ───────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

export function parseCsvText(text: string): StatRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseCsvLine(line);
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
  // "playerName\x00teamName\x00year" — tracks which (player, team, season) combos appear
  const playerYearTeamKeys = new Set<string>();

  for (const row of rows) {
    const key = `${row.year}::${row.team}::${row.opponent}::${row.game_date}::${row.home_away}`;
    gameKeys.add(key);
    if (row.player?.trim()) {
      playerNames.add(row.player.trim());
      playerYearTeamKeys.add(`${row.player.trim()}\x00${row.team?.trim() ?? ""}\x00${row.year ?? ""}`);
    }
  }

  const teamCache = new Map<string, string | null>();
  const seasonCache = new Map<number, string | null>();

  // Check games — match only, never create
  let matchedGames = 0;
  const unmatchedGames: string[] = [];

  for (const key of gameKeys) {
    const [year, team, opponent, gameDate, homeAway] = key.split("::");
    const teamKey = team?.toLowerCase() ?? "";
    if (!teamCache.has(teamKey)) teamCache.set(teamKey, await findTeamId(team));
    const teamId = teamCache.get(teamKey);
    const yearNum = parseInt(year, 10);
    if (!seasonCache.has(yearNum)) seasonCache.set(yearNum, await findSeasonId(yearNum));
    const seasonId = seasonCache.get(yearNum);
    const existing = teamId && seasonId
      ? await findGameId({ seasonId, teamId, opponent, gameDate: normDate(gameDate), homeAway })
      : null;
    if (existing) {
      matchedGames++;
    } else {
      unmatchedGames.push(`${team} vs ${opponent} on ${gameDate}`);
    }
  }

  // Check players exist in DB (active only)
  const unmatchedPlayers: string[] = [];
  let matchedPlayers = 0;
  const playerCache = new Map<string, string | null>();

  for (const name of playerNames) {
    const id = await findPlayerId(name);
    playerCache.set(name.toLowerCase(), id);
    if (id) matchedPlayers++;
    else unmatchedPlayers.push(name);
  }

  // Enrollment check: player must be enrolled AND assigned to their CSV team for the game's season.
  // Uses per-season cache so multi-season CSVs are handled correctly.
  const notOnRosterPlayers: string[] = [];
  let enrollmentChecked = false;
  const enrollmentCache = new Map<string, Map<string, string | null>>();

  for (const key of playerYearTeamKeys) {
    const parts = key.split("\x00");
    const playerName = parts[0];
    const teamName = parts[1];
    const yearNum = parseInt(parts[2], 10);

    const playerId = playerCache.get(playerName.toLowerCase());
    if (!playerId) continue; // already in unmatchedPlayers

    const teamKey = teamName.toLowerCase();
    if (!teamCache.has(teamKey)) teamCache.set(teamKey, await findTeamId(teamName));
    const teamId = teamCache.get(teamKey);

    const seasonId = seasonCache.get(yearNum);
    if (!seasonId || !teamId) continue; // season/team unknown — already flagged as unmatched game

    enrollmentChecked = true;

    if (!enrollmentCache.has(seasonId)) {
      enrollmentCache.set(seasonId, await getAllEnrollmentsForSeason(seasonId));
    }
    const enrollment = enrollmentCache.get(seasonId)!;

    const assignedTeamId = enrollment.get(playerId);
    const correctlyAssigned = enrollment.has(playerId) && assignedTeamId === teamId;
    if (!correctlyAssigned) {
      notOnRosterPlayers.push(playerName);
    }
  }

  return {
    totalRows: rows.length,
    uniqueGames: gameKeys.size,
    matchedGames,
    unmatchedGames,
    matchedPlayers,
    unmatchedPlayers,
    notOnRosterPlayers: [...new Set(notOnRosterPlayers)],
    enrollmentChecked,
  };
}

export async function importCsvRows(rows: StatRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    unmatchedPlayers: [],
    unmatchedGames: [],
    notOnRoster: [],
    errors: [],
  };

  // Cache lookups to avoid hammering the DB
  const teamCache = new Map<string, string | null>();
  const seasonCache = new Map<number, string | null>();
  const playerCache = new Map<string, string | null>();
  const gameCache = new Map<string, string | null>();
  const enrollmentCache = new Map<string, Map<string, string | null>>();

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

    // Match game — never auto-create
    const gameDate = normDate(row.game_date);
    const gameKey = `${seasonId}::${teamId}::${row.opponent}::${gameDate}::${row.home_away}`;
    if (!gameCache.has(gameKey)) {
      const id = await findMatchingGame({ seasonId, teamId, opponent: row.opponent, gameDate, homeAway: row.home_away });
      gameCache.set(gameKey, id);
      if (!id) {
        const label = `${row.team} vs ${row.opponent} on ${gameDate}`;
        if (!result.unmatchedGames.includes(label)) result.unmatchedGames.push(label);
      }
    }
    const gameId = gameCache.get(gameKey);

    // Skip rows whose game isn't in the calendar
    if (!gameId) { result.skipped++; continue; }

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

    // Enrollment check: must be enrolled AND assigned to this team for this season
    if (!enrollmentCache.has(seasonId)) {
      enrollmentCache.set(seasonId, await getAllEnrollmentsForSeason(seasonId));
    }
    const enrollment = enrollmentCache.get(seasonId)!;
    const assignedTeamId = enrollment.get(playerId);
    if (!enrollment.has(playerId) || assignedTeamId !== teamId) {
      if (!result.notOnRoster.includes(playerName)) result.notOnRoster.push(playerName);
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
