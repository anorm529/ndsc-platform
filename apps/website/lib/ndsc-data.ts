import { get, put } from "@vercel/blob";
import { unstable_cache } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import { teams as allTeams } from "@/app/data/teams";
import {
  normalizePlayerName,
  normalizeRecordId,
  type PlayerAward,
} from "@/app/members/lib/playerAwards";
import { dbQuery } from "@/lib/db";

export const CLUB_DATA_TAG = "ndsc-club-data";
export const CLUB_TEAM_SLUGS = ["buccaneers", "barracudas", "sluggers"] as const;
const SNAPSHOT_PATH = path.join(process.env.TMPDIR || "/tmp", "ndsc-club-data.json");
export const CLUB_DATA_BLOB_PATHNAME =
  process.env.CLUB_DATA_BLOB_PATHNAME?.trim() || "ndsc/club-data/latest.json";

export type ClubTeamSlug = (typeof CLUB_TEAM_SLUGS)[number];

export type TeamCard = {
  key: string;
  name: string;
  tag: string;
  desc: string;
  badge: string;
  captain: string;
  division: string;
  lastSeason: string;
  about: string;
  teamPhoto: string;
};

export type Match = {
  teamSlug: string;
  opponent: string;
  date: string;
  homeAway?: "Home" | "Away" | string;
  location?: string;
  result?: "W" | "L" | "D" | string | null;
  runsFor?: number | null;
  runsAgainst?: number | null;
  lat?: number | string | null;
  lon?: number | string | null;
};

export type LeagueRow = {
  Team: string;
  Position: number;
  Division: "A" | "B" | string;
  Points: number;
  Win: number;
  Loss: number;
  "Runs Scored"?: number;
  "Runs Awarded"?: number;
  Difference?: number;
  Streak?: string;
  Year: number | string;
};

export type PlayerStat = {
  teamSlug: string;
  playerName: string;
  season?: number | string;
  "record id"?: string;
  recordId?: string;
  record_id?: string;
  playerRecordId?: string;
  division?: string;
  gender?: string;
  ops?: number | string;
  avg?: number | string;
  obp?: number | string;
  slg?: number | string;
  ab?: number | string;
  hits?: number | string;
  bb?: number | string;
  rbi?: number | string;
  runs?: number | string;
  hr?: number | string;
  gamesPlayed?: number | string;
  innings?: number | string;
  singles_1b?: number | string;
  doubles_2b?: number | string;
  triples_3b?: number | string;
  batterout?: number | string;
  ob?: number | string;
  uao?: number | string;
  ao?: number | string;
  outs?: number | string;
};

type DataRow = Record<string, unknown>;

export type PlayerGameRecord = {
  season: number | null;
  teamSlug: string | null;
  gameNo: number | null;
  opponent: string | null;
  homeAway: string | null;
  innings: number | null;
  rbi: number | null;
  runs: number | null;
  bb: number | null;
  singles: number | null;
  doubles: number | null;
  triples: number | null;
  hr: number | null;
  batterOut: number | null;
  totalAb: number | null;
  totalOb: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  uaos: number | null;
  aos: number | null;
  totalOuts: number | null;
  uao?: number | null;
  ao?: number | null;
  outs?: number | null;
  UAOs?: number | null;
  AOs?: number | null;
  "Total Outs"?: number | null;
};

export type AwardsLookup = {
  byName: Record<string, PlayerAward[]>;
  byRecordId: Record<string, PlayerAward[]>;
};

export type GameDataLookup = {
  byName: Record<string, PlayerGameRecord[]>;
  byRecordId: Record<string, PlayerGameRecord[]>;
};

export type TeamSummary = {
  team: TeamCard;
  latestResult?: Match;
  nextFixture?: Match;
  division?: string;
};

export type ClubData = {
  generatedAt: string;
  source: "live" | "blob" | "snapshot" | "empty";
  warnings: string[];
  teams: TeamCard[];
  seasons: string[];
  stats: PlayerStat[];
  fixtures: Match[];
  standings: LeagueRow[];
  awardsLookup: AwardsLookup;
  awardsLookupByTeam: Record<ClubTeamSlug, AwardsLookup>;
  gameDataLookup: GameDataLookup;
  teamSummaries: Record<ClubTeamSlug, TeamSummary>;
};

export type TeamPageData = {
  generatedAt: string;
  source: ClubData["source"];
  warnings: string[];
  team: TeamCard;
  slug: ClubTeamSlug;
  selectedSeason?: string;
  availableSeasons: string[];
  players: PlayerStat[];
  division?: string;
  awardsLookup: AwardsLookup;
  gameDataLookup: GameDataLookup;
  nextMatch?: Match;
  lastResult?: Match;
  matches: Match[];
  recentForm: Match[];
  teamAvg: {
    ops: number | null;
    avg: number | null;
    obp: number | null;
    slg: number | null;
  };
  chartRows: Array<{
    name: string;
    gender?: string;
    ops: number;
    avg: number;
    obp: number;
    slg: number;
    ab: number;
    hr: number;
    bb: number;
    hits: number;
    rbi: number;
    runs: number;
    gp: number;
    uao: number;
    ao: number;
    outs: number;
    innings: number;
  }>;
};

let lastGoodClubData: ClubData | null = null;

function blobSnapshotEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function logInfo(message: string, extra?: unknown) {
  console.info(`[ndsc-data] ${message}`, extra ?? "");
}

function logWarn(message: string, extra?: unknown) {
  console.warn(`[ndsc-data] ${message}`, extra ?? "");
}

function teamSlugSet() {
  return new Set<string>(CLUB_TEAM_SLUGS);
}

function getClubTeams(): TeamCard[] {
  const clubSlugs = teamSlugSet();
  return allTeams.filter((team) => clubSlugs.has(team.key));
}

function emptyLookup(): AwardsLookup {
  return { byName: {}, byRecordId: {} };
}

function emptyGameLookup(): GameDataLookup {
  return { byName: {}, byRecordId: {} };
}

function emptyClubData(warnings: string[] = []): ClubData {
  const teams = getClubTeams();
  const summaries = Object.fromEntries(
    teams.map((team) => [
      team.key,
      {
        team,
      },
    ])
  ) as Record<ClubTeamSlug, TeamSummary>;

  return {
    generatedAt: new Date(0).toISOString(),
    source: "empty",
    warnings,
    teams,
    seasons: [],
    stats: [],
    fixtures: [],
    standings: [],
    awardsLookup: emptyLookup(),
    awardsLookupByTeam: {
      buccaneers: emptyLookup(),
      barracudas: emptyLookup(),
      sluggers: emptyLookup(),
    },
    gameDataLookup: emptyGameLookup(),
    teamSummaries: summaries,
  };
}

function isClubTeamSlug(value: string): value is ClubTeamSlug {
  return CLUB_TEAM_SLUGS.includes(value as ClubTeamSlug);
}

function pickString(row: DataRow, keys: string[]): string | null {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  }
  return null;
}

function pickNumber(row: DataRow, keys: string[]): number | null {
  for (const key of keys) {
    const raw = row[key];
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickYear(row: DataRow, keys: string[]): number | null {
  for (const key of keys) {
    const raw = row[key];
    const year = Number(raw);
    if (Number.isFinite(year)) return year;
  }
  return null;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function parseDate(value: unknown) {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getSnapshotWarnings() {
  return ["Serving last successful club snapshot."];
}

async function writeSnapshot(data: ClubData) {
  try {
    await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(data), "utf8");
  } catch (error) {
    logWarn("Failed to write club data snapshot", error);
  }
}

async function readBlobSnapshot(): Promise<ClubData | null> {
  if (!blobSnapshotEnabled()) return null;

  try {
    const result = await get(CLUB_DATA_BLOB_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;

    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw) as ClubData;

    return {
      ...parsed,
      source: "blob",
      warnings: parsed.warnings ?? [],
    };
  } catch (error) {
    logWarn("Failed to read published club snapshot from Blob", error);
    return null;
  }
}

async function writeBlobSnapshot(data: ClubData) {
  if (!blobSnapshotEnabled()) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  return put(CLUB_DATA_BLOB_PATHNAME, JSON.stringify(data), {
    access: "private",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function readSnapshot(): Promise<ClubData | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
    return JSON.parse(raw) as ClubData;
  } catch {
    return null;
  }
}

async function getFallbackClubData(reason: string): Promise<ClubData> {
  if (lastGoodClubData) {
    logWarn("Using in-memory club data fallback", reason);
    return {
      ...lastGoodClubData,
      source: "snapshot",
      warnings: [...lastGoodClubData.warnings, reason, ...getSnapshotWarnings()],
    };
  }

  const snapshot = await readSnapshot();
  if (snapshot) {
    logWarn("Using on-disk club data snapshot fallback", reason);
    lastGoodClubData = snapshot;
    return {
      ...snapshot,
      source: "snapshot",
      warnings: [...snapshot.warnings, reason, ...getSnapshotWarnings()],
    };
  }

  logWarn("No snapshot available; returning empty club data fallback", reason);
  return emptyClubData([reason, "No cached snapshot was available."]);
}

async function getPublishedClubData() {
  const blobData = await readBlobSnapshot();
  if (blobData) {
    logInfo("Serving published club snapshot from Blob", {
      pathname: CLUB_DATA_BLOB_PATHNAME,
      generatedAt: blobData.generatedAt,
    });
    lastGoodClubData = blobData;
    return blobData;
  }

  return null;
}

async function getPreviousClubDataForPartialRecovery(): Promise<ClubData | null> {
  if (lastGoodClubData) return lastGoodClubData;

  const published = await readBlobSnapshot();
  if (published) return published;

  const snapshot = await readSnapshot();
  if (snapshot) return snapshot;

  return null;
}

function isTruthyAwardValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return ["yes", "true", "y", "1", "x", "won"].includes(normalized);
}

function getAwardNamesFromRow(row: DataRow): string[] {
  const explicit = pickString(row, [
    "Award",
    "Awards",
    "award",
    "Award Name",
    "awardName",
    "award_name",
    "Honour",
    "honour",
    "Category",
    "category",
    "Title",
  ]);
  if (explicit) return [explicit];

  const metadataKeys = new Set(
    [
      "id",
      "Id",
      "ID",
      "record id",
      "Record ID",
      "recordId",
      "record_id",
      "playerRecordId",
      "player_record_id",
      "Player Record ID",
      "Player ID",
      "playerId",
      "Player Name",
      "playerName",
      "player_name",
      "Player",
      "Team",
      "team",
      "teamSlug",
      "team_slug",
      "Year",
      "year",
      "season",
      "created_at",
      "updated_at",
      "CreatedAt",
      "UpdatedAt",
      "Created At",
      "Updated At",
    ].map((key) => key.toLowerCase())
  );

  const names: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (metadataKeys.has(key.toLowerCase())) continue;
    if (!isTruthyAwardValue(value)) continue;
    names.push(key.trim());
  }

  return names.sort((a, b) => a.localeCompare(b));
}

export function pickPlayerRecordId(row: object): string | null {
  return pickString(row as Record<string, unknown>, [
    "record id",
    "Record ID",
    "recordId",
    "record_id",
    "playerRecordId",
    "player_record_id",
    "Player Record ID",
    "Player ID",
    "playerId",
  ]);
}

function pickGameRecordId(row: DataRow): string | null {
  return pickString(row, [
    "Record id",
    "record id",
    "Record ID",
    "recordId",
    "record_id",
    "playerRecordId",
  ]);
}

function toGameRecord(row: DataRow): PlayerGameRecord {
  return {
    season: pickNumber(row, ["Season", "season"]),
    teamSlug: pickString(row, ["Team Slug", "teamSlug", "team_slug"]),
    gameNo: pickNumber(row, ["Game no.", "Game No.", "gameNo", "game_no"]),
    opponent: pickString(row, ["Opponent", "opponent"]),
    homeAway: pickString(row, ["Home/Away", "homeAway", "home_away"]),
    innings: pickNumber(row, ["Innings", "innings"]),
    rbi: pickNumber(row, ["RBI's", "RBIs", "RBI", "rbi"]),
    runs: pickNumber(row, ["Total Runs", "runs", "Runs"]),
    bb: pickNumber(row, ["BB", "bb"]),
    singles: pickNumber(row, ["1B", "singles_1b"]),
    doubles: pickNumber(row, ["2B", "doubles_2b"]),
    triples: pickNumber(row, ["3B", "triples_3b"]),
    hr: pickNumber(row, ["HR", "hr"]),
    batterOut: pickNumber(row, ["Batter out", "batterout", "BO"]),
    totalAb: pickNumber(row, ["Total AB", "AB", "ab"]),
    totalOb: pickNumber(row, ["Total OB", "OB", "ob"]),
    obp: pickNumber(row, ["OBP", "obp"]),
    slg: pickNumber(row, ["SLG", "slg"]),
    ops: pickNumber(row, ["OPS", "ops"]),
    uaos: pickNumber(row, ["UAOs", "uaos", "unassistedOuts", "unassisted_outs", "UAO", "uao"]),
    aos: pickNumber(row, ["AOs", "aos", "assistedOuts", "assisted_outs", "AO", "ao"]),
    totalOuts: pickNumber(row, ["Total Outs", "totalOuts", "total_outs", "outs", "OUTS"]),
  };
}

function addLookupEntry<T>(
  lookup: Record<string, T[]>,
  key: string,
  entry: T
) {
  const bucket = lookup[key] ?? [];
  bucket.push(entry);
  lookup[key] = bucket;
}

function sortGameLookup(lookup: GameDataLookup) {
  for (const bucket of Object.values(lookup.byName)) {
    bucket.sort((a, b) => (a.gameNo ?? 0) - (b.gameNo ?? 0));
  }
  for (const bucket of Object.values(lookup.byRecordId)) {
    bucket.sort((a, b) => (a.gameNo ?? 0) - (b.gameNo ?? 0));
  }
}

function buildAwardsLookups(rows: DataRow[]) {
  const globalLookup: AwardsLookup = emptyLookup();
  const byTeam: Record<ClubTeamSlug, AwardsLookup> = {
    buccaneers: emptyLookup(),
    barracudas: emptyLookup(),
    sluggers: emptyLookup(),
  };

  for (const row of rows) {
    const playerName = pickString(row, ["Player Name", "playerName", "player_name", "Player"]);
    const playerNameKey = playerName ? normalizePlayerName(playerName) : null;
    const playerRecordId = pickPlayerRecordId(row);
    const awardNames = getAwardNamesFromRow(row);
    const year = pickYear(row, ["Year", "year", "season"]);
    const rowTeam = pickString(row, ["Team", "team", "teamSlug", "team_slug"]);
    const normalizedTeam = rowTeam?.toLowerCase().trim();

    if ((!playerName && !playerRecordId) || year == null || awardNames.length === 0) continue;

    for (const awardName of awardNames) {
      const awardEntry: PlayerAward = {
        year,
        award: awardName,
        team: rowTeam,
        playerNameKey: playerNameKey ?? undefined,
      };

      if (playerNameKey) {
        addLookupEntry(globalLookup.byName, playerNameKey, awardEntry);
      }

      if (playerRecordId) {
        addLookupEntry(globalLookup.byRecordId, normalizeRecordId(playerRecordId), awardEntry);
      }

      if (normalizedTeam && isClubTeamSlug(normalizedTeam)) {
        if (playerNameKey) {
          addLookupEntry(byTeam[normalizedTeam].byName, playerNameKey, awardEntry);
        }
        if (playerRecordId) {
          addLookupEntry(
            byTeam[normalizedTeam].byRecordId,
            normalizeRecordId(playerRecordId),
            awardEntry
          );
        }
      }
    }
  }

  return { globalLookup, byTeam };
}

function buildGameLookup(rows: DataRow[]): GameDataLookup {
  const uniqueRows = new Map<string, DataRow>();

  for (const row of rows) {
    const recordId = pickGameRecordId(row) ?? "";
    const playerName = pickString(row, ["Player", "player", "Player Name", "playerName"]) ?? "";
    const gameNo = String(pickNumber(row, ["Game no.", "Game No.", "gameNo", "game_no"]) ?? "");
    const season = String(pickNumber(row, ["Season", "season"]) ?? "");
    const teamSlug = pickString(row, ["Team Slug", "teamSlug", "team_slug"]) ?? "";
    const key = `${recordId}::${playerName}::${gameNo}::${season}::${teamSlug}`;
    if (!uniqueRows.has(key)) uniqueRows.set(key, row);
  }

  const lookup: GameDataLookup = emptyGameLookup();

  for (const row of uniqueRows.values()) {
    const playerName = pickString(row, ["Player", "player", "Player Name", "playerName"]);
    const recordId = pickGameRecordId(row);
    const parsed = toGameRecord(row);
    if (!playerName && !recordId) continue;

    if (playerName) {
      addLookupEntry(lookup.byName, normalizePlayerName(playerName), parsed);
    }

    if (recordId) {
      addLookupEntry(lookup.byRecordId, normalizeRecordId(recordId), parsed);
    }
  }

  sortGameLookup(lookup);
  return lookup;
}

function uniqueSeasons(stats: PlayerStat[], standings: LeagueRow[]) {
  const values = new Set<string>();

  for (const row of stats) {
    const season = String(row.season ?? "").trim();
    if (season) values.add(season);
  }

  for (const row of standings) {
    const season = String(row.Year ?? "").trim();
    if (season) values.add(season);
  }

  return Array.from(values).sort((a, b) => Number(b) - Number(a));
}

function buildTeamSummaries(stats: PlayerStat[], fixtures: Match[]) {
  const teams = getClubTeams();
  const summaries = Object.fromEntries(
    teams.map((team) => [team.key, { team }])
  ) as Record<ClubTeamSlug, TeamSummary>;
  const now = Date.now();

  for (const team of teams) {
    const slug = team.key as ClubTeamSlug;
    const players = stats.filter((row) => row.teamSlug === slug);
    const division = players.find((row) => row.division)?.division;
    const teamMatches = fixtures
      .filter((match) => match.teamSlug === slug)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));

    let latestResult: Match | undefined;
    let nextFixture: Match | undefined;

    for (const match of teamMatches) {
      const ts = parseDate(match.date);
      if (!Number.isFinite(ts)) continue;

      if (!latestResult && !isBlank(match.result)) latestResult = match;

      if (isBlank(match.result) && ts >= now) {
        if (!nextFixture || ts < parseDate(nextFixture.date)) {
          nextFixture = match;
        }
      }
    }

    summaries[slug] = {
      team,
      division,
      latestResult,
      nextFixture,
    };
  }

  return summaries;
}

function avgNum(values: Array<number | string | undefined>) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function aggregatePlayersAcrossSeasons(players: PlayerStat[]) {
  const grouped = new Map<string, PlayerStat>();
  const numericFields: (keyof PlayerStat)[] = [
    "ab",
    "hits",
    "bb",
    "rbi",
    "runs",
    "hr",
    "gamesPlayed",
    "innings",
    "singles_1b",
    "doubles_2b",
    "triples_3b",
    "batterout",
    "ob",
    "uao",
    "ao",
    "outs",
  ];

  const addNumber = (a: unknown, b: unknown) => {
    const left = Number(a) || 0;
    const right = Number(b) || 0;
    const sum = left + right;
    return Number.isFinite(sum) ? sum : 0;
  };

  for (const player of players) {
    const key = (player.playerName || "").trim();
    if (!key) continue;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...player });
      continue;
    }

    for (const field of numericFields) {
      (existing as Record<string, unknown>)[field] = addNumber(
        (existing as Record<string, unknown>)[field],
        (player as Record<string, unknown>)[field]
      );
    }
  }

  const aggregated = Array.from(grouped.values());

  for (const player of aggregated) {
    const ab = Number(player.ab) || 0;
    const bb = Number(player.bb) || 0;
    const singles = Number(player.singles_1b) || 0;
    const doubles = Number(player.doubles_2b) || 0;
    const triples = Number(player.triples_3b) || 0;
    const hr = Number(player.hr) || 0;
    const obRaw = Number(player.ob);
    const hits = singles + doubles + triples + hr;
    const avg = ab > 0 ? hits / ab : undefined;
    const onBase = Number.isFinite(obRaw) ? obRaw : hits + bb;
    const obp = ab + bb > 0 ? onBase / (ab + bb) : undefined;
    const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
    const slg = ab > 0 ? tb / ab : undefined;
    const ops =
      obp !== undefined &&
      slg !== undefined &&
      Number.isFinite(obp + slg)
        ? obp + slg
        : undefined;

    player.hits = hits;
    player.avg = avg as number | string | undefined;
    player.obp = obp as number | string | undefined;
    player.slg = slg as number | string | undefined;
    player.ops = ops as number | string | undefined;
  }

  aggregated.sort((a, b) => (Number(b.ops) || 0) - (Number(a.ops) || 0));
  return aggregated;
}

function getPlayerGender(player: PlayerStat) {
  const rawGender =
    player.gender ??
    ((player as Record<string, unknown>)["Gender"] as string | undefined) ??
    ((player as Record<string, unknown>)["gender"] as string | undefined);

  return typeof rawGender === "string" && rawGender.trim().length > 0
    ? rawGender.trim()
    : undefined;
}

function buildChartRows(players: PlayerStat[]) {
  return players.map((player) => ({
    name: player.playerName,
    gender: getPlayerGender(player),
    ops: Number(player.ops) || 0,
    avg: Number(player.avg) || 0,
    obp: Number(player.obp) || 0,
    slg: Number(player.slg) || 0,
    ab: Number(player.ab) || 0,
    hr: Number(player.hr) || 0,
    bb: Number(player.bb) || 0,
    hits: Number(player.hits) || 0,
    rbi: Number(player.rbi) || 0,
    runs: Number(player.runs) || 0,
    gp: Number(player.gamesPlayed) || 0,
    uao: Number(player.uao) || 0,
    ao: Number(player.ao) || 0,
    outs: Number(player.outs) || 0,
    innings: Number(player.innings) || 0,
  }));
}

function filterRecentForm(fixtures: Match[]) {
  const results = fixtures.filter((match) => !isBlank(match.result));
  return results.slice(0, 5);
}

async function getPublicTableColumns(tableName: string) {
  const result = await dbQuery<{ column_name: string }>(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
    `,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function firstColumn(columns: Set<string>, names: string[]) {
  return names.find((name) => columns.has(name)) ?? null;
}

function optionalColumn(
  columns: Set<string>,
  names: string[],
  fallback: string = "null"
) {
  const name = firstColumn(columns, names);
  return name ? quoteIdentifier(name) : fallback;
}

function mapStatRows(rows: DataRow[]): PlayerStat[] {
  return rows.map((row) => {
    const singles = Number(row.singles_1b) || 0;
    const doubles = Number(row.doubles_2b) || 0;
    const triples = Number(row.triples_3b) || 0;
    const hr = Number(row.hr) || 0;
    const hits = Number(row.hits) || singles + doubles + triples + hr;
    const walks = Number(row.bb) || 0;

    return {
      teamSlug: String(row.teamSlug ?? "").trim().toLowerCase(),
      playerName: String(row.playerName ?? "").trim(),
      season: row.season as string | number | undefined,
      recordId: row.recordId ? String(row.recordId) : undefined,
      division: row.division ? String(row.division) : undefined,
      gender: row.gender ? String(row.gender) : undefined,
      gamesPlayed: row.gamesPlayed as number | string | undefined,
      innings: row.innings as number | string | undefined,
      rbi: row.rbi as number | string | undefined,
      runs: row.runs as number | string | undefined,
      bb: walks,
      singles_1b: singles,
      doubles_2b: doubles,
      triples_3b: triples,
      hr,
      batterout: row.batterout as number | string | undefined,
      ab: row.ab as number | string | undefined,
      ob: hits + walks,
      uao: row.uao as number | string | undefined,
      ao: row.ao as number | string | undefined,
      outs: row.outs as number | string | undefined,
      hits,
      avg: row.avg as number | string | undefined,
      obp: row.obp as number | string | undefined,
      slg: row.slg as number | string | undefined,
      ops: row.ops as number | string | undefined,
    };
  });
}

function resultFromMatch(row: DataRow) {
  const explicit = String(row.result ?? "").trim().toUpperCase();
  if (["W", "L", "D"].includes(explicit)) return explicit;

  const status = String(row.status ?? "").trim().toLowerCase();
  const runsFor = Number(row.runsFor);
  const runsAgainst = Number(row.runsAgainst);
  const completed = ["completed", "played", "final", "finished"].includes(status);

  if (!completed || !Number.isFinite(runsFor) || !Number.isFinite(runsAgainst)) {
    return null;
  }

  if (runsFor > runsAgainst) return "W";
  if (runsFor < runsAgainst) return "L";
  return "D";
}

function mapMatchRows(rows: DataRow[]): Match[] {
  return rows.map((row) => ({
    teamSlug: String(row.teamSlug ?? "").trim().toLowerCase(),
    opponent: String(row.opponent ?? "").trim(),
    date: String(row.date ?? ""),
    homeAway: row.homeAway ? String(row.homeAway) : undefined,
    location: row.location ? String(row.location) : undefined,
    result: resultFromMatch(row),
    runsFor: pickNumber(row, ["runsFor"]),
    runsAgainst: pickNumber(row, ["runsAgainst"]),
    lat: row.lat as number | string | null | undefined,
    lon: row.lon as number | string | null | undefined,
  }));
}

function mapStandingsRows(rows: DataRow[]): LeagueRow[] {
  return rows.map((row) => ({
    Team: String(row.Team ?? ""),
    Position: Number(row.Position) || 0,
    Division: String(row.Division ?? ""),
    Points: Number(row.Points) || 0,
    Win: Number(row.Win) || 0,
    Loss: Number(row.Loss) || 0,
    "Runs Scored": Number(row["Runs Scored"]) || 0,
    "Runs Awarded": Number(row["Runs Awarded"]) || 0,
    Difference: Number(row.Difference) || 0,
    Streak: row.Streak ? String(row.Streak) : "",
    Year: row.Year as number | string,
  }));
}

async function fetchPlayerStats() {
  const result = await dbQuery<DataRow>(`
    select
      s.year as "season",
      t.slug as "teamSlug",
      t.name as "team",
      p.display_name as "playerName",
      p.id::text as "recordId",
      p.gender as "gender",
      pss.games_played as "gamesPlayed",
      pss.innings,
      pss.rbis as "rbi",
      pss.runs,
      pss.walks as "bb",
      pss.singles as "singles_1b",
      pss.doubles as "doubles_2b",
      pss.triples as "triples_3b",
      pss.home_runs as "hr",
      pss.batter_outs as "batterout",
      pss.at_bats as "ab",
      pss.unassisted_outs as "uao",
      pss.assisted_outs as "ao",
      pss.total_outs as "outs",
      pss.total_hits as "hits",
      pss.avg,
      pss.obp,
      pss.slg,
      pss.ops
    from public.player_season_stats pss
    join public.seasons s on s.id = pss.season_id
    join public.teams t on t.id = pss.team_id
    join public.players p on p.id = pss.player_id

    union all

    select
      pssa.year as "season",
      lower(coalesce(t.slug, pssa.team)) as "teamSlug",
      coalesce(t.name, pssa.team) as "team",
      coalesce(p.display_name, pssa.player) as "playerName",
      coalesce(pssa.player_id::text, p.id::text) as "recordId",
      coalesce(p.gender, pssa.gender) as "gender",
      pssa.games_played as "gamesPlayed",
      pssa.innings,
      pssa.rbis as "rbi",
      pssa.runs,
      pssa.walks as "bb",
      pssa.singles as "singles_1b",
      pssa.doubles as "doubles_2b",
      pssa.triples as "triples_3b",
      pssa.home_runs as "hr",
      pssa.batter_out as "batterout",
      pssa.at_bats as "ab",
      pssa.uaos as "uao",
      pssa.aos as "ao",
      coalesce(pssa.uaos, 0) + coalesce(pssa.aos, 0) as "outs",
      pssa.hits,
      pssa.avg,
      pssa.obp,
      pssa.slg,
      pssa.ops
    from public.player_season_stats_archive pssa
    left join public.teams t on t.id = pssa.team_id
    left join public.players p on p.id = pssa.player_id

    union all

    -- Live season stats aggregated from individual game records for any season/team
    -- not yet summarised in player_season_stats (e.g. the current in-progress season).
    select
      s.year as "season",
      t.slug as "teamSlug",
      t.name as "team",
      p.display_name as "playerName",
      p.id::text as "recordId",
      p.gender as "gender",
      count(*)::int as "gamesPlayed",
      sum(pgs.innings)::int as "innings",
      sum(pgs.rbis)::int as "rbi",
      sum(pgs.runs)::int as "runs",
      sum(pgs.walks)::int as "bb",
      sum(pgs.singles)::int as "singles_1b",
      sum(pgs.doubles)::int as "doubles_2b",
      sum(pgs.triples)::int as "triples_3b",
      sum(pgs.home_runs)::int as "hr",
      sum(pgs.batter_outs)::int as "batterout",
      sum(pgs.at_bats)::int as "ab",
      sum(pgs.unassisted_outs)::int as "uao",
      sum(pgs.assisted_outs)::int as "ao",
      (sum(pgs.unassisted_outs) + sum(pgs.assisted_outs))::int as "outs",
      sum(pgs.singles + pgs.doubles + pgs.triples + pgs.home_runs)::int as "hits",
      case when sum(pgs.at_bats) > 0
        then round(sum(pgs.singles + pgs.doubles + pgs.triples + pgs.home_runs)::numeric / sum(pgs.at_bats), 3)
        else null end as "avg",
      case when (sum(pgs.at_bats) + sum(pgs.walks)) > 0
        then round((sum(pgs.singles + pgs.doubles + pgs.triples + pgs.home_runs) + sum(pgs.walks))::numeric / (sum(pgs.at_bats) + sum(pgs.walks)), 3)
        else null end as "obp",
      case when sum(pgs.at_bats) > 0
        then round((sum(pgs.singles) + 2*sum(pgs.doubles) + 3*sum(pgs.triples) + 4*sum(pgs.home_runs))::numeric / sum(pgs.at_bats), 3)
        else null end as "slg",
      case when sum(pgs.at_bats) > 0 and (sum(pgs.at_bats) + sum(pgs.walks)) > 0
        then round(
          (sum(pgs.singles + pgs.doubles + pgs.triples + pgs.home_runs) + sum(pgs.walks))::numeric / (sum(pgs.at_bats) + sum(pgs.walks))
          + (sum(pgs.singles) + 2*sum(pgs.doubles) + 3*sum(pgs.triples) + 4*sum(pgs.home_runs))::numeric / sum(pgs.at_bats),
        3)
        else null end as "ops"
    from public.player_game_stats pgs
    join public.games g on g.id = pgs.game_id
    join public.seasons s on s.id = g.season_id
    join public.teams t on t.id = g.team_id
    join public.players p on p.id = pgs.player_id
    where not exists (
      select 1 from public.player_season_stats pss2
      where pss2.player_id = pgs.player_id
        and pss2.season_id = g.season_id
        and pss2.team_id = g.team_id
    )
    and not exists (
      select 1 from public.player_season_stats_archive pssa2
      where pssa2.player_id = pgs.player_id
        and pssa2.year = s.year
    )
    group by s.year, t.slug, t.name, p.display_name, p.id, p.gender

    order by "season" desc, "teamSlug", "playerName"
  `);

  return mapStatRows(result.rows);
}

async function fetchFixtures() {
  const result = await dbQuery<DataRow>(`
    select
      t.slug as "teamSlug",
      g.opponent,
      coalesce(g.scheduled_at, g.game_date::timestamp)::text as "date",
      g.home_away as "homeAway",
      g.location,
      g.runs_for as "runsFor",
      g.runs_against as "runsAgainst",
      g.status,
      g.result,
      g.latitude as "lat",
      g.longitude as "lon"
    from public.games g
    join public.teams t on t.id = g.team_id
    join public.seasons s on s.id = g.season_id
    order by coalesce(g.scheduled_at, g.game_date::timestamp) desc, t.name
  `);

  return mapMatchRows(result.rows);
}

export async function getLeagueStandingsData() {
  const columns = await getPublicTableColumns("league_standings");
  const team = optionalColumn(columns, ["team_name", "team", "Team"], "''");
  const division = optionalColumn(columns, ["division", "Division"], "''");
  const year = columns.has("year") || columns.has("Year")
    ? optionalColumn(columns, ["year", "Year"], "null")
    : "s.year";
  const wins = optionalColumn(columns, ["wins", "win", "Win"], "0");
  const losses = optionalColumn(columns, ["losses", "loss", "Loss"], "0");
  const runsFor = optionalColumn(columns, ["runs_for", "runs_scored", "Runs Scored"], "0");
  const runsAgainst = optionalColumn(
    columns,
    ["runs_against", "runs_allowed", "runs_awarded", "Runs Awarded"],
    "0"
  );
  const points = optionalColumn(columns, ["points", "Points"], `(coalesce(${wins}, 0) * 2)`);
  const difference = optionalColumn(
    columns,
    ["difference", "run_difference", "Difference"],
    `(coalesce(${runsFor}, 0) - coalesce(${runsAgainst}, 0))`
  );
  const streak = optionalColumn(columns, ["streak", "Streak"], "''");

  const position = columns.has("position")
    ? quoteIdentifier("position")
    : columns.has("Position")
      ? quoteIdentifier("Position")
      : `row_number() over (
          partition by ${division}, ${year}
          order by coalesce(${points}, 0) desc, coalesce(${wins}, 0) desc, coalesce(${difference}, 0) desc
        )`;

  const result = await dbQuery<DataRow>(`
    select
      ${team} as "Team",
      ${position} as "Position",
      ${division} as "Division",
      ${points} as "Points",
      ${wins} as "Win",
      ${losses} as "Loss",
      ${runsFor} as "Runs Scored",
      ${runsAgainst} as "Runs Awarded",
      ${difference} as "Difference",
      ${streak} as "Streak",
      ${year} as "Year"
    from public.league_standings
    ${columns.has("season_id") && !columns.has("year") && !columns.has("Year") ? "join public.seasons s on s.id = season_id" : ""}
    order by "Year" desc nulls last, "Division", "Position", "Team"
  `);

  return mapStandingsRows(result.rows);
}

async function fetchAwardsRows() {
  const columns = await getPublicTableColumns("awards");
  const playerText = optionalColumn(columns, ["player_text", "player", "Player"], "null");

  const result = await dbQuery<DataRow>(`
    select
      coalesce(s.year, extract(year from a.created_at)::int) as "Year",
      t.slug as "teamSlug",
      t.name as "Team",
      coalesce(p.display_name, ${playerText}) as "Player Name",
      p.id::text as "recordId",
      a.award as "Award",
      a.notes
    from public.awards a
    left join public.seasons s on s.id = a.season_id
    left join public.teams t on t.id = a.team_id
    left join public.players p on p.id = a.player_id
    order by "Year" desc nulls last, "Team", "Award", "Player Name"
  `);

  return result.rows;
}

async function fetchPlayerGameRows() {
  const result = await dbQuery<DataRow>(`
    select
      p.id::text as "Record id",
      p.display_name as "Player",
      s.year as "Season",
      t.slug as "Team Slug",
      row_number() over (
        partition by p.id, g.season_id, g.team_id
        order by coalesce(g.scheduled_at, g.game_date::timestamp), g.opponent
      ) as "Game no.",
      g.opponent as "Opponent",
      g.home_away as "Home/Away",
      pgs.innings as "Innings",
      pgs.rbis as "RBI",
      pgs.runs as "Total Runs",
      pgs.walks as "BB",
      pgs.singles as "1B",
      pgs.doubles as "2B",
      pgs.triples as "3B",
      pgs.home_runs as "HR",
      pgs.batter_outs as "Batter out",
      pgs.at_bats as "Total AB",
      pgs.total_on_base as "Total OB",
      pgs.obp as "OBP",
      pgs.slg as "SLG",
      pgs.ops as "OPS",
      pgs.unassisted_outs as "UAOs",
      pgs.assisted_outs as "AOs",
      coalesce(
        pgs.total_outs,
        coalesce(pgs.unassisted_outs, 0) + coalesce(pgs.assisted_outs, 0)
      ) as "Total Outs"
    from public.player_game_stats pgs
    join public.games g on g.id = pgs.game_id
    join public.seasons s on s.id = g.season_id
    join public.teams t on t.id = g.team_id
    join public.players p on p.id = pgs.player_id
    order by p.display_name, "Season", "Team Slug", "Game no."
  `);

  return result.rows;
}

async function fetchClubDataLive(): Promise<ClubData> {
  logInfo("Fetching live club dataset from Neon/Postgres");

  const warnings: string[] = [];
  const recoveryData = await getPreviousClubDataForPartialRecovery();

  const [statsResult, fixturesResult, standingsResult, awardsResult, gameRowsResult] =
    await Promise.allSettled([
      fetchPlayerStats(),
      fetchFixtures(),
      getLeagueStandingsData(),
      fetchAwardsRows(),
      fetchPlayerGameRows(),
    ]);

  const stats = statsResult.status === "fulfilled" ? statsResult.value : [];
  const fixtures = fixturesResult.status === "fulfilled" ? fixturesResult.value : [];
  const standings = standingsResult.status === "fulfilled" ? standingsResult.value : [];
  const awardsRows = awardsResult.status === "fulfilled" ? awardsResult.value : [];
  const gameRows = gameRowsResult.status === "fulfilled" ? gameRowsResult.value : [];

  for (const result of [
    ["team stats", statsResult],
    ["matches", fixturesResult],
    ["league standings", standingsResult],
    ["awards", awardsResult],
    ["player games", gameRowsResult],
  ] as const) {
    if (result[1].status === "rejected") {
      const reason =
        result[1].reason instanceof Error ? result[1].reason.message : String(result[1].reason);
      warnings.push(`${result[0]} fetch failed${reason ? `: ${reason}` : ""}`);
    }
  }

  const clubTeamKeys = teamSlugSet();
  const filteredStats = stats.filter((row) => clubTeamKeys.has(String(row.teamSlug).trim()));
  const filteredFixtures = fixtures.filter((row) =>
    clubTeamKeys.has(String(row.teamSlug).trim())
  );
  const filteredStandings = standings;

  if (
    warnings.length > 0 &&
    filteredStats.length === 0 &&
    filteredFixtures.length === 0 &&
    filteredStandings.length === 0
  ) {
    return getFallbackClubData(`Live Neon fetch failed: ${warnings.join(", ")}`);
  }

  const { globalLookup, byTeam } = buildAwardsLookups(awardsRows);
  const gameDataLookup =
    gameRowsResult.status === "fulfilled"
      ? buildGameLookup(gameRows)
      : recoveryData?.gameDataLookup ?? emptyGameLookup();

  if (gameRowsResult.status === "rejected" && recoveryData?.gameDataLookup) {
    warnings.push("player games reused from previous published snapshot");
  }

  const clubData: ClubData = {
    generatedAt: new Date().toISOString(),
    source: "live",
    warnings,
    teams: getClubTeams(),
    seasons: uniqueSeasons(filteredStats, filteredStandings),
    stats: filteredStats,
    fixtures: filteredFixtures,
    standings: filteredStandings,
    awardsLookup: globalLookup,
    awardsLookupByTeam: byTeam,
    gameDataLookup,
    teamSummaries: buildTeamSummaries(filteredStats, filteredFixtures),
  };

  lastGoodClubData = clubData;
  await writeSnapshot(clubData);
  return clubData;
}

export async function publishClubDataSnapshot() {
  const liveData = await fetchClubDataLive();
  if (liveData.source !== "live") {
    throw new Error("Live Neon fetch did not complete successfully enough to publish.");
  }

  const blob = await writeBlobSnapshot({
    ...liveData,
    source: "blob",
  });

  return {
    pathname: blob.pathname,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    generatedAt: liveData.generatedAt,
    source: liveData.source,
    warnings: liveData.warnings,
    gameDataPlayers: Object.keys(liveData.gameDataLookup.byName).length,
  };
}

const _fetchClubDataCached = unstable_cache(
  async (): Promise<ClubData> => {
    logInfo("Serving club data (cache miss — fetching from Neon)");
    try {
      const data = await fetchClubDataLive();
      if (data.source !== "empty") {
        lastGoodClubData = data;
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      const published = await getPublishedClubData();
      if (published) {
        return {
          ...published,
          warnings: [...published.warnings, `Live Neon refresh failed: ${message}`],
        };
      }

      const data = await getFallbackClubData(`Club data refresh failed: ${message}`);
      if (data.source !== "empty") {
        lastGoodClubData = data;
      }
      return data;
    }
  },
  ["club-data"],
  { revalidate: 300, tags: [CLUB_DATA_TAG] }
);

export async function getClubData() {
  return _fetchClubDataCached();
}

export async function getTeamPageData(
  team: string,
  season?: string
): Promise<TeamPageData | null> {
  const normalizedTeam = team.toLowerCase().trim();
  if (!isClubTeamSlug(normalizedTeam)) return null;

  const clubData = await getClubData();
  const teamMeta = clubData.teams.find((entry) => entry.key === normalizedTeam);
  if (!teamMeta) return null;

  const selectedSeason = season?.trim() || undefined;
  const teamStats = clubData.stats.filter((row) => row.teamSlug === normalizedTeam);
  const availableSeasons = Array.from(
    new Set(
      teamStats
        .map((row) => String(row.season ?? "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => Number(b) - Number(a));

  const seasonPlayers = selectedSeason
    ? teamStats.filter((row) => String(row.season ?? "").trim() === selectedSeason)
    : aggregatePlayersAcrossSeasons(teamStats);

  const division = seasonPlayers.find((player) => player.division)?.division;
  const teamFixtures = clubData.fixtures
    .filter((match) => match.teamSlug === normalizedTeam)
    .sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const now = Date.now();
  let nextMatch: Match | undefined;
  let lastResult: Match | undefined;

  for (const match of teamFixtures) {
    const ts = parseDate(match.date);
    if (!Number.isFinite(ts)) continue;

    if (!lastResult && !isBlank(match.result)) lastResult = match;

    if (isBlank(match.result) && ts >= now) {
      if (!nextMatch || ts < parseDate(nextMatch.date)) {
        nextMatch = match;
      }
    }
  }

  return {
    generatedAt: clubData.generatedAt,
    source: clubData.source,
    warnings: clubData.warnings,
    team: teamMeta,
    slug: normalizedTeam,
    selectedSeason,
    availableSeasons,
    players: seasonPlayers,
    division,
    awardsLookup: clubData.awardsLookupByTeam[normalizedTeam],
    gameDataLookup: clubData.gameDataLookup,
    nextMatch,
    lastResult,
    matches: teamFixtures,
    recentForm: filterRecentForm(teamFixtures),
    teamAvg: {
      ops: avgNum(seasonPlayers.map((player) => player.ops)),
      avg: avgNum(seasonPlayers.map((player) => player.avg)),
      obp: avgNum(seasonPlayers.map((player) => player.obp)),
      slg: avgNum(seasonPlayers.map((player) => player.slg)),
    },
    chartRows: buildChartRows(seasonPlayers),
  };
}
