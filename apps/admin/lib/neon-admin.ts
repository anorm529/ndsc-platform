import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCsv, type CsvRow } from "@/lib/csv";
import { dbQuery, isDatabaseConfigured, validateDatabaseUrl } from "@/lib/db";

export type NeonAdminSection = {
  slug: string;
  label: string;
  description: string;
  tables: string[];
  uploadTable?: string;
  uploadRequired?: string[];
};

export type DbColumn = {
  name: string;
  dataType: string;
  udtName: string;
  nullable: boolean;
  hasDefault: boolean;
  identity: boolean;
  generated: boolean;
  primary: boolean;
};

export type FieldOption = {
  value: string;
  label: string;
};

export type TableAdminData = {
  tableName: string;
  exists: boolean;
  columns: DbColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  relationOptions: Record<string, FieldOption[]>;
  error?: string;
};

export type UploadPreview = {
  targetTable: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  headers: string[];
  errors: Array<{ rowNumber: number; message: string }>;
};

export class UploadValidationError extends Error {
  errors: UploadPreview["errors"];
  preview: UploadPreview;

  constructor(message: string, preview: UploadPreview) {
    super(message);
    this.name = "UploadValidationError";
    this.errors = preview.errors;
    this.preview = preview;
  }
}

export type UploadTemplate = {
  slug: string;
  label: string;
  targetTable: string;
  headers: string[];
  requiredHeaders: string[];
  notes?: string[];
};

export type GameStatsUploadOverviewItem = {
  year: number | null;
  team: string;
  opponent: string;
  gameDate: string | null;
  homeAway: string;
  statRows: number;
};

export type GameStatsUploadOverviewTeam = {
  team: string;
  totalGames: number;
  uploadedGames: number;
  totalStatRows: number;
  games: GameStatsUploadOverviewItem[];
};

export type DatabaseOverviewTable = {
  tableName: string;
  exists: boolean;
  totalRows: number | null;
};

export type DatabaseHealthMetric = {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

export type DatabaseOverview = {
  configured: boolean;
  tables: DatabaseOverviewTable[];
  error?: string;
  health?: {
    checkedAt: string;
    connectionMs: number;
    metrics: DatabaseHealthMetric[];
    recentErrors: Array<{
      rowNumber: number | null;
      message: string;
      createdAt: string | null;
    }>;
    recentBatches: Array<{
      targetTable: string;
      status: string;
      totalRows: number | null;
      importedRows: number | null;
      createdAt: string | null;
    }>;
  };
};

const identifierSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

export const neonAdminSections: NeonAdminSection[] = [
  {
    slug: "seasons",
    label: "Seasons",
    description: "Create seasons, edit year/status fields, and review active or archived years.",
    tables: ["seasons"],
    uploadTable: "seasons",
    uploadRequired: ["year"],
  },
  {
    slug: "teams",
    label: "NDSC Teams",
    description: "Manage NDSC teams and their team-season records.",
    tables: ["teams", "team_seasons"],
    uploadTable: "teams",
    uploadRequired: ["name"],
  },
  {
    slug: "players",
    label: "Players",
    description: "Manage players — edit names, gender, and active status.",
    tables: ["players"],
    uploadTable: "players",
    uploadRequired: ["player"],
  },
  {
    slug: "player-assignments",
    label: "Player Assignments",
    description: "Bulk assign players to teams and seasons after player records exist.",
    tables: ["player_team_seasons"],
    uploadTable: "player_team_seasons",
    uploadRequired: ["player", "team", "year"],
  },
  {
    slug: "calendar",
    label: "Calendar",
    description: "Use games as the central fixtures and results table.",
    tables: ["games"],
    uploadTable: "games",
    uploadRequired: ["year", "team", "opponent"],
  },
  {
    slug: "game-stats",
    label: "Player Game Stats",
    description: "Manually maintain raw player game stat rows. Rate stats stay database-calculated.",
    tables: ["player_game_stats"],
    uploadTable: "player_game_stats",
    uploadRequired: ["year", "team", "opponent", "player"],
  },
  {
    slug: "eos-stats",
    label: "EOS Stats",
    description: "Refresh generated player season stats and review archived season stats.",
    tables: ["player_season_stats", "player_season_stats_archive"],
  },
  {
    slug: "season-archive-upload",
    label: "Season Archive Upload",
    description: "Upload historical/manual season totals into the archive table.",
    tables: ["player_season_stats_archive"],
    uploadTable: "player_season_stats_archive",
    uploadRequired: ["year", "team", "player"],
  },
  {
    slug: "league-standings",
    label: "League Standings",
    description: "Manage standings rows, including non-NDSC teams.",
    tables: ["league_standings"],
    uploadTable: "league_standings",
    uploadRequired: ["team", "year"],
  },
  {
    slug: "awards",
    label: "Awards",
    description: "Manage end-of-season awards with linked or free-text player/team values.",
    tables: ["awards"],
    uploadTable: "awards",
    uploadRequired: ["year", "award"],
  },
];

export const uploadSections = neonAdminSections.filter((section) => section.uploadTable);

const blockedSourceColumns = new Set(["avg", "obp", "slg", "ops"]);
const csvColumnAliases: Record<string, string[]> = {
  year: ["year", "season", "season_year"],
  season: ["season", "year", "season_year"],
  team: ["team", "team_slug", "team_name", "ndsc_team"],
  opponent: ["opponent", "opponent_name"],
  gamedate: ["game_date", "date", "played_at", "scheduled_at"],
  date: ["date", "game_date", "played_at", "scheduled_at"],
  homeaway: ["home_away", "homeAway", "home_or_away"],
  player: ["player", "player_name", "name"],
  gamesplayed: ["games_played", "gamesplayed"],
  innings: ["innings"],
  rbi: ["rbi", "rbis"],
  rbis: ["rbi", "rbis"],
  runs: ["runs", "total_runs"],
  totalruns: ["runs", "total_runs"],
  bb: ["bb", "walks"],
  walks: ["walks", "bb"],
  "1b": ["singles", "singles_1b", "one_b", "b1"],
  singles: ["singles", "singles_1b"],
  "2b": ["doubles", "doubles_2b", "two_b", "b2"],
  doubles: ["doubles", "doubles_2b"],
  "3b": ["triples", "triples_3b", "three_b", "b3"],
  triples: ["triples", "triples_3b"],
  hr: ["hr", "home_runs", "homeruns"],
  homeruns: ["home_runs", "homeruns", "hr"],
  batterout: ["batter_out", "batterout", "batter_outs", "batterouts"],
  batterouts: ["batter_outs", "batter_out", "batterout"],
  ab: ["ab", "at_bats", "atbats"],
  atbats: ["at_bats", "atbats", "ab"],
  uaos: ["uaos", "uao", "unassisted_outs", "unassistedouts"],
  uao: ["uao", "uaos", "unassisted_outs", "unassistedouts"],
  unassistedouts: ["unassisted_outs", "uaos", "uao"],
  aos: ["aos", "ao", "assisted_outs", "assistedouts"],
  ao: ["ao", "aos", "assisted_outs", "assistedouts"],
  assistedouts: ["assisted_outs", "aos", "ao"],
  runsawarded: ["runs_awarded", "runs_against", "runs_allowed"],
  runsagainst: ["runs_against", "runs_awarded", "runs_allowed"],
  runsscored: ["runs_scored", "runs_for"],
  runsfor: ["runs_for", "runs_scored"],
  wins: ["wins", "win"],
  win: ["win", "wins"],
  losses: ["losses", "loss"],
  loss: ["loss", "losses"],
  award: ["award", "award_name", "name"],
};

function assertIdentifier(value: string) {
  return identifierSchema.parse(value);
}

function quoteIdent(value: string) {
  return `"${assertIdentifier(value).replace(/"/g, '""')}"`;
}

function normalizeKey(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function normalizeDateInput(value: string) {
  const trimmed = value.trim();
  const ukDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (ukDate) {
    const [, day, month, year] = ukDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return trimmed;
}

function normalizeChoice(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeStatusValue(value: string, allowedValues: string[]) {
  const normalized = normalizeChoice(value);

  if (!normalized || allowedValues.length === 0) {
    return value.trim();
  }

  const direct = allowedValues.find((allowed) => normalizeChoice(allowed) === normalized);

  if (direct) {
    return direct;
  }

  const groups = [
    ["completed", "complete", "played", "final", "finished", "done", "result"],
    ["scheduled", "fixture", "upcoming", "pending"],
    ["postponed", "ppd", "delayed"],
    ["cancelled", "canceled", "void"],
  ];
  const group = groups.find((entries) => entries.includes(normalized));

  if (!group) {
    return value.trim();
  }

  return allowedValues.find((allowed) => group.includes(normalizeChoice(allowed))) || value.trim();
}

async function getAllowedCheckValues(tableName: string, columnName: string) {
  const result = await dbQuery<{ definition: string }>(
    `select pg_get_constraintdef(c.oid) as definition
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = $1
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%' || $2 || '%'`,
    [tableName, columnName],
  );
  const values = new Set<string>();

  for (const row of result.rows) {
    for (const match of row.definition.matchAll(/'((?:''|[^'])*)'/g)) {
      values.add(match[1].replace(/''/g, "'"));
    }
  }

  return [...values];
}

function getSectionBySlug(slug: string) {
  return neonAdminSections.find((section) => section.slug === slug);
}

function getSectionForTable(tableName: string) {
  return neonAdminSections.find((section) => section.tables.includes(tableName));
}

function labelForRow(row: Record<string, unknown>) {
  const preferredKeys = [
    "display_name",
    "name",
    "player_name",
    "team_name",
    "slug",
    "year",
    "season",
    "id",
  ];

  for (const key of preferredKeys) {
    const value = row[key];

    if (value != null && String(value).trim()) {
      return String(value);
    }
  }

  return String(Object.values(row).find((value) => value != null) || "");
}

async function getLookupOptions(tableName: string, onlyUnassignedPlayers = false) {
  if (!(await tableExists(tableName))) {
    return [] as FieldOption[];
  }

  const query =
    tableName === "players" && onlyUnassignedPlayers && (await tableExists("player_team_seasons"))
      ? `select p.*
         from public.players p
         where not exists (
           select 1 from public.player_team_seasons pts where pts.player_id = p.id
         )
         order by coalesce(p.display_name, p.normalized_name, p.id::text)
         limit 500`
      : `select * from public.${quoteIdent(tableName)} limit 500`;
  const result = await dbQuery(query);

  return result.rows
    .filter((row) => row.id != null)
    .map((row) => ({
      value: String(row.id),
      label: labelForRow(row),
    }));
}

async function getRelationOptions(tableName: string, columns: DbColumn[]) {
  const options: Record<string, FieldOption[]> = {};

  for (const column of columns) {
    if (!column.name.endsWith("_id")) {
      continue;
    }

    if (column.name === "player_id") {
      options[column.name] = await getLookupOptions("players");
    } else if (column.name === "team_id") {
      options[column.name] = await getLookupOptions("teams");
    } else if (column.name === "season_id") {
      options[column.name] = await getLookupOptions("seasons");
    } else if (column.name === "game_id") {
      options[column.name] = await getLookupOptions("games");
    }
  }

  return options;
}

function coerceValue(column: DbColumn, rawValue: FormDataEntryValue | string | null) {
  if (rawValue == null) {
    return null;
  }

  const value = String(rawValue).trim();

  if (value === "") {
    return null;
  }

  if (["int2", "int4", "int8"].includes(column.udtName)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (["float4", "float8", "numeric"].includes(column.udtName)) {
    const parsed = Number(value.replace(/^'+|'+$/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (column.udtName === "bool") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  if (column.udtName === "date") {
    return normalizeDateInput(value);
  }

  return value;
}

function coerceStatValue(column: DbColumn, rawValue: FormDataEntryValue | string | null) {
  const value = rawValue == null ? "" : String(rawValue).trim();

  if (
    value === "" &&
    ["int2", "int4", "int8", "float4", "float8", "numeric"].includes(column.udtName)
  ) {
    return 0;
  }

  return coerceValue(column, rawValue);
}

function editableColumns(columns: DbColumn[]) {
  return columns.filter((column) => !column.identity && !column.generated && !isSystemManagedColumn(column));
}

function primaryColumns(columns: DbColumn[]) {
  return columns.filter((column) => column.primary);
}

function getColumnByNormalizedName(columns: DbColumn[], key: string) {
  const normalized = normalizeKey(key);
  const direct = columns.find((column) => normalizeKey(column.name) === normalized);

  if (direct) {
    return direct;
  }

  const aliases = csvColumnAliases[normalized] || [];
  return columns.find((column) =>
    aliases.some((alias) => normalizeKey(column.name) === normalizeKey(alias)),
  );
}

function isSystemManagedColumn(column: DbColumn) {
  return [
    "id",
    "created_at",
    "createdat",
    "updated_at",
    "updatedat",
    "deleted_at",
    "deletedat",
    "uploaded_at",
    "uploadedat",
  ].includes(column.name.toLowerCase());
}

function getRequiredUploadColumns(section: NeonAdminSection, columns: DbColumn[]) {
  if (section.slug === "player-assignments") {
    return ["player", "team", "year"];
  }

  if (section.slug === "league-standings") {
    return ["team", "year"];
  }

  if (section.slug === "awards") {
    return ["award", "year"];
  }

  if (section.slug === "calendar") {
    return ["year", "team", "opponent"];
  }

  if (section.slug === "game-stats") {
    return ["year", "team", "opponent", "game_date", "player"];
  }

  if (section.slug === "season-archive-upload") {
    return ["year", "team", "player"];
  }

  return (section.uploadRequired || []).filter((required) => getColumnByNormalizedName(columns, required));
}

function getUploadHeaders(section: NeonAdminSection, columns: DbColumn[]) {
  if (section.slug === "player-assignments") {
    return {
      headers: ["player", "team", "year", "squad_status"],
      requiredHeaders: ["player", "team", "year"],
    };
  }

  if (section.slug === "awards") {
    return {
      headers: ["award", "year", "team", "player", "notes"],
      requiredHeaders: ["award", "year"],
    };
  }

  if (section.slug === "calendar") {
    return {
      headers: [
        "opponent",
        "year",
        "team",
        "game_date",
        "home_away",
        "location",
        "runs_for",
        "runs_against",
        "notes",
        "scheduled_at",
        "latitude",
        "longitude",
        "status",
      ],
      requiredHeaders: ["year", "team", "opponent"],
    };
  }

  if (section.slug === "game-stats") {
    return {
      headers: [
        "year",
        "team",
        "opponent",
        "game_date",
        "home_away",
        "player",
        "innings",
        "rbi",
        "runs",
        "bb",
        "1b",
        "2b",
        "3b",
        "hr",
        "batter_outs",
        "ab",
        "unassisted_outs",
        "assisted_outs",
      ],
      requiredHeaders: ["year", "team", "opponent", "game_date", "player"],
    };
  }

  if (section.slug === "season-archive-upload") {
    return {
      headers: [
        "year",
        "team",
        "player",
        "gender",
        "games_played",
        "innings",
        "rbi",
        "runs",
        "bb",
        "1b",
        "2b",
        "3b",
        "hr",
        "batter_out",
        "ab",
        "uaos",
        "aos",
        "notes",
      ],
      requiredHeaders: ["year", "team", "player"],
    };
  }

  if (section.slug === "league-standings") {
    const handledColumns = new Set(["season_id", "team_id", "year", "team", "team_name", "imported_at"]);
    const optionalHeaders = columns
      .filter(
        (column) =>
          !column.identity &&
          !column.generated &&
          !isSystemManagedColumn(column) &&
          !blockedSourceColumns.has(normalizeKey(column.name)) &&
          !handledColumns.has(column.name),
      )
      .map((column) => column.name);

    return {
      headers: ["year", "team", ...optionalHeaders],
      requiredHeaders: ["team", "year"],
    };
  }

  const requiredHeaders = getRequiredUploadColumns(section, columns);
  const requiredColumnNames = new Set(
    requiredHeaders
      .map((required) => getColumnByNormalizedName(columns, required)?.name)
      .filter(Boolean),
  );
  const optionalHeaders = columns
    .filter(
      (column) =>
        !column.identity &&
        !column.generated &&
        !isSystemManagedColumn(column) &&
        !blockedSourceColumns.has(normalizeKey(column.name)) &&
        !requiredColumnNames.has(column.name),
    )
    .map((column) => column.name);

  return {
    headers: [
      ...requiredHeaders.map((required) => getColumnByNormalizedName(columns, required)?.name || required),
      ...optionalHeaders,
    ],
    requiredHeaders,
  };
}

export function getNeonAdminSection(slug: string) {
  return getSectionBySlug(slug);
}

export type PlayerOverviewEntry = {
  id: string;
  displayName: string;
  active: boolean;
  teamName: string | null;
};

export async function getPlayersOverview(): Promise<PlayerOverviewEntry[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const hasPlayers = await tableExists("players");
    if (!hasPlayers) return [];

    const hasTeams = await tableExists("teams");
    const hasPts = await tableExists("player_team_seasons");
    const hasSeasons = await tableExists("seasons");

    if (hasTeams && hasPts && hasSeasons) {
      const result = await dbQuery<{
        id: string;
        display_name: string;
        active: boolean;
        team_name: string | null;
      }>(
        `select
           p.id::text,
           p.display_name,
           p.active,
           t.name as team_name
         from public.players p
         left join lateral (
           select pts.team_id
           from public.player_team_seasons pts
           join public.seasons s on s.id = pts.season_id
           where pts.player_id = p.id
             and s.year = (
               select max(s2.year)
               from public.player_team_seasons pts2
               join public.seasons s2 on s2.id = pts2.season_id
               where pts2.player_id = p.id
             )
         ) current_teams on true
         left join public.teams t on t.id = current_teams.team_id
         order by p.active desc, t.name nulls last, p.display_name`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        active: row.active,
        teamName: row.team_name,
      }));
    }

    const result = await dbQuery<{ id: string; display_name: string; active: boolean }>(
      `select id::text, display_name, active from public.players order by active desc, display_name`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      active: row.active,
      teamName: null,
    }));
  } catch {
    return [];
  }
}

export async function getDatabaseOverview(): Promise<DatabaseOverview> {
  const start = performance.now();
  const validationError = validateDatabaseUrl();

  if (!isDatabaseConfigured() || validationError) {
    return {
      configured: false,
      tables: [] as DatabaseOverviewTable[],
      error: validationError || "DATABASE_URL is not configured.",
    } satisfies DatabaseOverview;
  }

  try {
    const tables = await Promise.all(
      Array.from(new Set(neonAdminSections.flatMap((section) => section.tables))).map(
        async (tableName) => {
          const exists = await tableExists(tableName);

          if (!exists) {
            return { tableName, exists, totalRows: null };
          }

          const count = await dbQuery<{ count: string }>(
            `select count(*)::text as count from public.${quoteIdent(tableName)}`,
          );

          return { tableName, exists, totalRows: Number(count.rows[0]?.count || 0) };
        },
      ),
    );
    const connectionMs = Math.round(performance.now() - start);
    const totalRows = tables.reduce((sum, table) => sum + (table.totalRows || 0), 0);
    const missingTables = tables.filter((table) => !table.exists);
    const [recentErrors, recentBatches] = await Promise.all([
      getRecentUploadErrors(),
      getRecentUploadBatches(),
    ]);
    const failedBatchCount = recentBatches.filter((batch) => batch.status.toLowerCase() === "failed").length;
    const metrics: DatabaseHealthMetric[] = [
      {
        label: "Connection",
        value: `${connectionMs}ms`,
        tone: connectionMs > 1500 ? "warning" : "success",
      },
      {
        label: "Configured tables",
        value: `${tables.length - missingTables.length}/${tables.length}`,
        tone: missingTables.length > 0 ? "danger" : "success",
      },
      {
        label: "Total rows",
        value: totalRows.toLocaleString("en-GB"),
        tone: "neutral",
      },
      {
        label: "Recent upload errors",
        value: recentErrors.length.toString(),
        tone: recentErrors.length > 0 ? "warning" : "success",
      },
      {
        label: "Recent failed imports",
        value: failedBatchCount.toString(),
        tone: failedBatchCount > 0 ? "warning" : "success",
      },
    ];

    return {
      configured: true,
      tables,
      health: {
        checkedAt: new Date().toISOString(),
        connectionMs,
        metrics,
        recentErrors,
        recentBatches,
      },
    } satisfies DatabaseOverview;
  } catch (error) {
    return {
      configured: false,
      tables: [] as DatabaseOverviewTable[],
      error: error instanceof Error ? error.message : "Unable to connect to Neon.",
    } satisfies DatabaseOverview;
  }
}

async function getRecentUploadErrors() {
  if (!(await tableExists("upload_errors"))) {
    return [] as NonNullable<DatabaseOverview["health"]>["recentErrors"];
  }

  const columns = await getTableColumns("upload_errors");
  const hasColumn = (name: string) => columns.some((column) => column.name === name);
  const rowNumberSql = hasColumn("row_number") ? "row_number" : "null";
  const messageSql = hasColumn("message")
    ? "message"
    : hasColumn("error_message")
      ? "error_message"
      : "''";
  const createdAtSql = hasColumn("created_at")
    ? "created_at"
    : hasColumn("createdat")
      ? "createdat"
      : "null";
  const orderSql = hasColumn("created_at")
    ? "created_at desc"
    : hasColumn("createdat")
      ? "createdat desc"
      : "1 desc";

  const result = await dbQuery<{
    row_number: number | null;
    message: string | null;
    created_at: Date | string | null;
  }>(
    `select
       ${rowNumberSql} as row_number,
       ${messageSql} as message,
       ${createdAtSql} as created_at
     from public.upload_errors
     order by ${orderSql}
     limit 5`,
  );

  return result.rows.map((row) => ({
    rowNumber: row.row_number,
    message: row.message || "Upload error",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }));
}

async function getRecentUploadBatches() {
  if (!(await tableExists("upload_batches"))) {
    return [] as NonNullable<DatabaseOverview["health"]>["recentBatches"];
  }

  const columns = await getTableColumns("upload_batches");
  const hasColumn = (name: string) => columns.some((column) => column.name === name);
  const targetSql = hasColumn("target_table")
    ? "target_table"
    : hasColumn("table_name")
      ? "table_name"
      : "''";
  const statusSql = hasColumn("status") ? "status" : "''";
  const totalRowsSql = hasColumn("total_rows") ? "total_rows" : "null";
  const importedRowsSql = hasColumn("imported_rows")
    ? "imported_rows"
    : hasColumn("success_rows")
      ? "success_rows"
      : "null";
  const createdAtSql = hasColumn("created_at")
    ? "created_at"
    : hasColumn("createdat")
      ? "createdat"
      : "null";
  const orderSql = hasColumn("created_at")
    ? "created_at desc"
    : hasColumn("createdat")
      ? "createdat desc"
      : "1 desc";

  const result = await dbQuery<{
    target_table: string | null;
    status: string | null;
    total_rows: string | number | null;
    imported_rows: string | number | null;
    created_at: Date | string | null;
  }>(
    `select
       ${targetSql} as target_table,
       ${statusSql} as status,
       ${totalRowsSql} as total_rows,
       ${importedRowsSql} as imported_rows,
       ${createdAtSql} as created_at
     from public.upload_batches
     order by ${orderSql}
     limit 5`,
  );

  return result.rows.map((row) => ({
    targetTable: row.target_table || "unknown",
    status: row.status || "unknown",
    totalRows: row.total_rows == null ? null : Number(row.total_rows),
    importedRows: row.imported_rows == null ? null : Number(row.imported_rows),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }));
}

export async function getUploadTemplates() {
  const templates: UploadTemplate[] = [];

  for (const section of uploadSections) {
    if (!section.uploadTable) {
      continue;
    }

    try {
      if (!(await tableExists(section.uploadTable))) {
        templates.push({
          slug: section.slug,
          label: section.label,
          targetTable: section.uploadTable,
          headers: [],
          requiredHeaders: section.uploadRequired || [],
        });
        continue;
      }

      const columns = await getTableColumns(section.uploadTable);
      const { headers, requiredHeaders } = getUploadHeaders(section, columns);
      const notes =
        section.slug === "calendar"
          ? [
              `Allowed status values: ${
                (await getAllowedCheckValues("games", "status")).join(", ") || "not detected"
              }`,
            ]
          : undefined;

      templates.push({
        slug: section.slug,
        label: section.label,
        targetTable: section.uploadTable,
        headers,
        requiredHeaders,
        notes,
      });
    } catch {
      templates.push({
        slug: section.slug,
        label: section.label,
        targetTable: section.uploadTable,
        headers: [],
        requiredHeaders: section.uploadRequired || [],
      });
    }
  }

  return templates;
}

async function tableExists(tableName: string) {
  const result = await dbQuery<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = $1
    )`,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function getTableColumns(tableName: string) {
  const result = await dbQuery<{
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: "YES" | "NO";
    column_default: string | null;
    identity_generation: string | null;
    is_generated: "ALWAYS" | "NEVER";
    is_primary: boolean;
  }>(
    `select
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default,
      c.identity_generation,
      c.is_generated,
      exists (
        select 1
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name
          and tc.table_schema = kcu.table_schema
          and tc.table_name = kcu.table_name
        where tc.constraint_type = 'PRIMARY KEY'
          and tc.table_schema = c.table_schema
          and tc.table_name = c.table_name
          and kcu.column_name = c.column_name
      ) as is_primary
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = $1
    order by c.ordinal_position`,
    [tableName],
  );

  return result.rows.map((column) => ({
    name: column.column_name,
    dataType: column.data_type,
    udtName: column.udt_name,
    nullable: column.is_nullable === "YES",
    hasDefault: Boolean(column.column_default),
    identity: Boolean(column.identity_generation),
    generated: column.is_generated !== "NEVER",
    primary: column.is_primary,
  })) satisfies DbColumn[];
}

export async function getTableAdminData(tableName: string): Promise<TableAdminData> {
  if (!isDatabaseConfigured()) {
    return {
      tableName,
      exists: false,
      columns: [],
      rows: [],
      totalRows: 0,
      relationOptions: {},
      error: "DATABASE_URL is not configured.",
    };
  }

  try {
    const exists = await tableExists(tableName);

    if (!exists) {
      return { tableName, exists, columns: [], rows: [], totalRows: 0, relationOptions: {} };
    }

    const columns = await getTableColumns(tableName);
    const relationOptions = await getRelationOptions(tableName, columns);
    const orderColumn =
      columns.find((column) => ["year", "season", "date", "game_date", "id"].includes(column.name))
        ?.name || columns[0]?.name;
    const orderSql = orderColumn ? ` order by ${quoteIdent(orderColumn)} desc nulls last` : "";
    const rowsResult = await dbQuery(
      `select * from public.${quoteIdent(tableName)}${orderSql} limit 100`,
    );
    const countResult = await dbQuery<{ count: string }>(
      `select count(*)::text as count from public.${quoteIdent(tableName)}`,
    );

    return {
      tableName,
      exists,
      columns,
      rows: rowsResult.rows,
      totalRows: Number(countResult.rows[0]?.count || rowsResult.rowCount || 0),
      relationOptions,
    };
  } catch (error) {
    return {
      tableName,
      exists: false,
      columns: [],
      rows: [],
      totalRows: 0,
      relationOptions: {},
      error: error instanceof Error ? error.message : "Unable to read table.",
    };
  }
}

export async function getGameStatsUploadOverview(): Promise<GameStatsUploadOverviewTeam[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const hasGames = await tableExists("games");
    const hasStats = await tableExists("player_game_stats");
    const hasTeams = await tableExists("teams");
    const hasSeasons = await tableExists("seasons");

    if (!hasGames || !hasStats || !hasTeams || !hasSeasons) {
      return [];
    }

    const result = await dbQuery<{
      year: number | null;
      team: string;
      opponent: string;
      game_date: Date | string | null;
      home_away: string;
      stat_rows: string | number;
    }>(
      `select
        s.year,
        t.name as team,
        g.opponent,
        g.game_date,
        g.home_away,
        count(pgs.id)::int as stat_rows
       from public.games g
       join public.teams t on t.id = g.team_id
       join public.seasons s on s.id = g.season_id
       left join public.player_game_stats pgs on pgs.game_id = g.id
       group by s.year, t.name, g.opponent, g.game_date, g.home_away
       order by t.name, g.game_date nulls last, g.opponent`,
    );

    const teams = new Map<string, GameStatsUploadOverviewTeam>();

    for (const row of result.rows) {
      const teamName = row.team || "Unknown team";
      const statRows = Number(row.stat_rows || 0);
      const existing = teams.get(teamName) || {
        team: teamName,
        totalGames: 0,
        uploadedGames: 0,
        totalStatRows: 0,
        games: [],
      };

      existing.totalGames += 1;
      existing.uploadedGames += statRows > 0 ? 1 : 0;
      existing.totalStatRows += statRows;
      existing.games.push({
        year: row.year == null ? null : Number(row.year),
        team: teamName,
        opponent: row.opponent || "Unknown opponent",
        gameDate: row.game_date ? new Date(row.game_date).toISOString().slice(0, 10) : null,
        homeAway: row.home_away || "",
        statRows,
      });

      teams.set(teamName, existing);
    }

    return Array.from(teams.values());
  } catch {
    return [];
  }
}

function revalidateMembersAdmin() {
  revalidatePath("/members/admin/database");
  for (const section of neonAdminSections) {
    revalidatePath(`/members/admin/${section.slug}`);
  }
  revalidatePath("/members/admin/uploads");
}

export async function createNeonRecord(formData: FormData) {
  const tableName = String(formData.get("tableName") || "");
  const section = getSectionForTable(tableName);

  if (!section) {
    throw new Error("This table is not enabled for admin editing.");
  }

  const columns = await getTableColumns(tableName);
  const writableColumns = editableColumns(columns).filter((column) => {
    if (column.hasDefault && !formData.has(`field:${column.name}`)) {
      return false;
    }

    return formData.has(`field:${column.name}`);
  });
  const values = writableColumns.map((column) => coerceValue(column, formData.get(`field:${column.name}`)));

  if (writableColumns.length === 0) {
    throw new Error("No editable values were submitted.");
  }

  const columnSql = writableColumns.map((column) => quoteIdent(column.name)).join(", ");
  const valueSql = writableColumns.map((_, index) => `$${index + 1}`).join(", ");

  await dbQuery(`insert into public.${quoteIdent(tableName)} (${columnSql}) values (${valueSql})`, values);
  revalidateMembersAdmin();
}

export async function updateNeonRecord(formData: FormData) {
  const tableName = String(formData.get("tableName") || "");
  const columns = await getTableColumns(tableName);
  const pkColumns = primaryColumns(columns);

  if (!getSectionForTable(tableName)) {
    throw new Error("This table is not enabled for admin editing.");
  }

  if (pkColumns.length === 0) {
    throw new Error("This table needs a primary key before records can be updated safely.");
  }

  const writableColumns = editableColumns(columns).filter(
    (column) => !column.primary && formData.has(`field:${column.name}`),
  );
  const values = writableColumns.map((column) => coerceValue(column, formData.get(`field:${column.name}`)));
  const assignments = writableColumns
    .map((column, index) => `${quoteIdent(column.name)} = $${index + 1}`)
    .join(", ");
  const whereValues = pkColumns.map((column) => coerceValue(column, formData.get(`pk:${column.name}`)));
  const whereSql = pkColumns
    .map((column, index) => `${quoteIdent(column.name)} = $${writableColumns.length + index + 1}`)
    .join(" and ");

  if (!assignments) {
    throw new Error("No editable values were submitted.");
  }

  await dbQuery(
    `update public.${quoteIdent(tableName)} set ${assignments} where ${whereSql}`,
    [...values, ...whereValues],
  );
  revalidateMembersAdmin();
}

export async function deleteNeonRecord(formData: FormData) {
  const tableName = String(formData.get("tableName") || "");
  const columns = await getTableColumns(tableName);
  const pkColumns = primaryColumns(columns);

  if (!getSectionForTable(tableName)) {
    throw new Error("This table is not enabled for admin editing.");
  }

  if (pkColumns.length === 0) {
    throw new Error("This table needs a primary key before records can be deleted safely.");
  }

  const values = pkColumns.map((column) => coerceValue(column, formData.get(`pk:${column.name}`)));
  const whereSql = pkColumns.map((column, index) => `${quoteIdent(column.name)} = $${index + 1}`).join(" and ");

  await dbQuery(`delete from public.${quoteIdent(tableName)} where ${whereSql}`, values);
  revalidateMembersAdmin();
}

async function findPlayerId(playerName: string) {
  const result = await dbQuery<{ id: string }>(
    `select id::text as id
     from public.players
     where lower(trim(display_name)) = lower(trim($1))
        or lower(trim(normalized_name)) = lower(trim($1))
     limit 1`,
    [playerName],
  );

  return result.rows[0]?.id || "";
}

async function findTeamId(teamName: string) {
  const result = await dbQuery<{ id: string }>(
    `select id::text as id
     from public.teams
     where lower(trim(name)) = lower(trim($1))
        or lower(trim(slug)) = lower(trim($1))
     limit 1`,
    [teamName],
  );

  return result.rows[0]?.id || "";
}

async function findSeasonId(year: string) {
  const result = await dbQuery<{ id: string }>(
    `select id::text as id
     from public.seasons
     where year::text = trim($1)
     limit 1`,
    [year],
  );

  return result.rows[0]?.id || "";
}

async function findGameId({
  year,
  teamName,
  opponent,
  gameDate,
  homeAway,
}: {
  year: string;
  teamName: string;
  opponent: string;
  gameDate: string;
  homeAway?: string;
}) {
  const seasonId = await findSeasonId(year);
  const teamId = await findTeamId(teamName);

  if (!seasonId || !teamId || !opponent.trim() || !gameDate.trim()) {
    return "";
  }

  const values: unknown[] = [
    seasonId,
    teamId,
    opponent.trim(),
    normalizeDateInput(gameDate),
  ];
  const homeAwaySql = homeAway?.trim()
    ? `and lower(trim(home_away::text)) = lower(trim($5))`
    : "";

  if (homeAway?.trim()) {
    values.push(homeAway.trim());
  }

  const result = await dbQuery<{ id: string }>(
    `select id::text as id
     from public.games
     where season_id = $1
       and team_id = $2
       and lower(trim(opponent)) = lower(trim($3))
       and game_date::date = $4::date
       ${homeAwaySql}
     limit 1`,
    values,
  );

  return result.rows[0]?.id || "";
}

async function mapCsvRowToColumns(row: CsvRow, columns: DbColumn[], targetTable: string) {
  const payload: Record<string, unknown> = {};

  if (targetTable === "player_season_stats_archive") {
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const playerId = playerName ? await findPlayerId(playerName) : "";
    const teamId = teamName ? await findTeamId(teamName) : "";
    const seasonId = year ? await findSeasonId(year) : "";

    payload.player = playerName;
    payload.team = teamName;

    if (year) {
      payload.year = Number.parseInt(year, 10);
    }

    if (playerId) {
      payload.player_id = playerId;
    }

    if (teamId) {
      payload.team_id = teamId;
    }

    if (seasonId) {
      payload.season_id = seasonId;
    }

    for (const [header, rawValue] of Object.entries(row)) {
      const normalizedHeader = normalizeKey(header);

      if (
        ["year", "season", "seasonid", "team", "teamid", "player", "playerid", "playername"].includes(
          normalizedHeader,
        )
      ) {
        continue;
      }

      const column = getColumnByNormalizedName(columns, header);

      if (!column || column.identity || column.generated || isSystemManagedColumn(column)) {
        continue;
      }

      if (blockedSourceColumns.has(normalizeKey(column.name))) {
        continue;
      }

      payload[column.name] = coerceStatValue(column, rawValue);
    }

    return payload;
  }

  if (targetTable === "player_game_stats") {
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();
    const opponent = String(row.opponent || row.Opponent || "").trim();
    const gameDate = String(row.game_date || row["Game Date"] || row.date || row.Date || "").trim();
    const homeAway = String(row.home_away || row["Home/Away"] || row.homeAway || "").trim();
    const playerId = playerName ? await findPlayerId(playerName) : "";
    const gameId = await findGameId({ year, teamName, opponent, gameDate, homeAway });

    if (playerId) {
      payload.player_id = playerId;
    }

    if (gameId) {
      payload.game_id = gameId;
    }

    for (const [header, rawValue] of Object.entries(row)) {
      const normalizedHeader = normalizeKey(header);

      if (
        [
          "year",
          "season",
          "seasonid",
          "team",
          "teamid",
          "opponent",
          "gamedate",
          "date",
          "homeaway",
          "player",
          "playerid",
          "playername",
          "gameid",
        ].includes(normalizedHeader)
      ) {
        continue;
      }

      const column = getColumnByNormalizedName(columns, header);

      if (!column || column.identity || column.generated || isSystemManagedColumn(column)) {
        continue;
      }

      if (blockedSourceColumns.has(normalizeKey(column.name))) {
        continue;
      }

      payload[column.name] = coerceStatValue(column, rawValue);
    }

    return payload;
  }

  if (targetTable === "league_standings") {
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();
    const teamId = teamName ? await findTeamId(teamName) : "";
    const seasonId = year ? await findSeasonId(year) : "";

    if (columns.some((column) => column.name === "team_id") && teamId) {
      payload.team_id = teamId;
    }

    if (columns.some((column) => column.name === "season_id") && seasonId) {
      payload.season_id = seasonId;
    }

    if (columns.some((column) => column.name === "team") && teamName) {
      payload.team = teamName;
    }

    if (columns.some((column) => column.name === "team_name") && teamName) {
      payload.team_name = teamName;
    }

    if (columns.some((column) => column.name === "year") && year) {
      payload.year = Number.parseInt(year, 10);
    }

    for (const [header, rawValue] of Object.entries(row)) {
      const normalizedHeader = normalizeKey(header);

      if (["year", "season", "seasonid", "team", "teamslug", "teamid"].includes(normalizedHeader)) {
        continue;
      }

      const column = getColumnByNormalizedName(columns, header);

      if (!column || column.identity || column.generated || isSystemManagedColumn(column)) {
        continue;
      }

      if (blockedSourceColumns.has(normalizeKey(column.name))) {
        continue;
      }

      payload[column.name] = coerceValue(column, rawValue);
    }

    return payload;
  }

  if (targetTable === "player_team_seasons" || targetTable === "awards" || targetTable === "games") {
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row["Team"] || "").trim();
    const year = String(
      row.year ||
        row.Year ||
        row.season ||
        row.Season ||
        row.season_id ||
        row["Season ID"] ||
        "",
    ).trim();
    const squadStatus = String(row.squad_status || row["Squad Status"] || "").trim();
    const award = String(row.award || row.Award || row.award_name || row["Award Name"] || "").trim();
    const notes = String(row.notes || row.Notes || "").trim();
    const playerId = playerName ? await findPlayerId(playerName) : "";
    const teamId = teamName ? await findTeamId(teamName) : "";
    const seasonId = year ? await findSeasonId(year) : "";

    if (playerId) {
      payload.player_id = playerId;
    }

    if (teamId) {
      payload.team_id = teamId;
    }

    if (seasonId) {
      payload.season_id = seasonId;
    }

    if (squadStatus && columns.some((column) => column.name === "squad_status")) {
      payload.squad_status = squadStatus;
    }

    if (award) {
      const awardColumn =
        columns.find((column) => column.name === "award") ||
        columns.find((column) => column.name === "award_name") ||
        columns.find((column) => column.name === "name");

      if (awardColumn) {
        payload[awardColumn.name] = award;
      }
    }

    if (notes && columns.some((column) => column.name === "notes")) {
      payload.notes = notes;
    }

    if (targetTable === "games") {
      const allowedStatuses = await getAllowedCheckValues("games", "status");

      for (const [header, rawValue] of Object.entries(row)) {
        const normalizedHeader = normalizeKey(header);

        if (["year", "season", "seasonid", "team", "teamid"].includes(normalizedHeader)) {
          continue;
        }

        const column = getColumnByNormalizedName(columns, header);

        if (!column || column.identity || column.generated || isSystemManagedColumn(column)) {
          continue;
        }

        if (column.name === "status") {
          payload.status = normalizeStatusValue(String(rawValue), allowedStatuses);
          continue;
        }

        payload[column.name] = coerceValue(column, rawValue);
      }
    }

    return payload;
  }

  for (const [header, rawValue] of Object.entries(row)) {
    const column = getColumnByNormalizedName(columns, header);

    if (!column || column.identity || column.generated || isSystemManagedColumn(column)) {
      continue;
    }

    if (blockedSourceColumns.has(normalizeKey(column.name))) {
      continue;
    }

    payload[column.name] = coerceValue(column, rawValue);
  }

  return payload;
}

async function validateUploadRow(
  section: NeonAdminSection,
  row: CsvRow,
  columns: DbColumn[],
  rowNumber: number,
) {
  const errors: string[] = [];
  const requiredColumns = getRequiredUploadColumns(section, columns);

  for (const required of requiredColumns) {
    const column = getColumnByNormalizedName(columns, required);
    const matchingHeader = [
      "player-assignments",
      "league-standings",
      "awards",
      "calendar",
      "game-stats",
      "season-archive-upload",
    ].includes(section.slug)
      ? Object.keys(row).find((key) => {
          const normalizedKey = normalizeKey(key);

          if (required === "year") {
            return ["year", "season", "seasonid"].includes(normalizedKey);
          }

          if (required === "team") {
            return ["team", "teamslug", "teamid"].includes(normalizedKey);
          }

          if (required === "game_date") {
            return ["gamedate", "date"].includes(normalizedKey);
          }

          return normalizedKey === normalizeKey(required);
        })
      : column
      ? Object.keys(row).find((key) => getColumnByNormalizedName(columns, key)?.name === column.name)
      : "";
    const value = matchingHeader ? row[matchingHeader] : "";

    if (!String(value || "").trim()) {
      errors.push(`Row ${rowNumber}: missing ${required}.`);
    }
  }

  if (section.slug === "player-assignments" && errors.length === 0) {
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row["Team"] || "").trim();
    const year = String(row.year || row.Year || row.season || row.Season || "").trim();

    if (!(await findPlayerId(playerName))) {
      errors.push(`Row ${rowNumber}: player not found (${playerName}).`);
    }

    if (!(await findTeamId(teamName))) {
      errors.push(`Row ${rowNumber}: team not found (${teamName}).`);
    }

    if (!(await findSeasonId(year))) {
      errors.push(`Row ${rowNumber}: season not found (${year}).`);
    }
  }

  if (section.slug === "awards" && errors.length === 0) {
    const year = String(row.year || row.Year || row.season || row.Season || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row["Team"] || "").trim();
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();

    if (year && !(await findSeasonId(year))) {
      errors.push(`Row ${rowNumber}: season not found (${year}).`);
    }

    if (teamName && !(await findTeamId(teamName))) {
      errors.push(`Row ${rowNumber}: team not found (${teamName}).`);
    }

    if (playerName && !(await findPlayerId(playerName))) {
      errors.push(`Row ${rowNumber}: player not found (${playerName}).`);
    }
  }

  if (section.slug === "league-standings" && errors.length === 0) {
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();

    if (columns.some((column) => column.name === "season_id") && year && !(await findSeasonId(year))) {
      errors.push(`Row ${rowNumber}: season not found (${year}).`);
    }

    if (columns.some((column) => column.name === "team_id") && teamName && !(await findTeamId(teamName))) {
      errors.push(`Row ${rowNumber}: team not found (${teamName}).`);
    }
  }

  if (section.slug === "calendar" && errors.length === 0) {
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();
    const status = String(row.status || row.Status || "").trim();

    if (year && !(await findSeasonId(year))) {
      errors.push(`Row ${rowNumber}: season not found (${year}).`);
    }

    if (teamName && !(await findTeamId(teamName))) {
      errors.push(`Row ${rowNumber}: team not found (${teamName}).`);
    }

    if (status) {
      const allowedStatuses = await getAllowedCheckValues("games", "status");
      const normalizedStatus = normalizeStatusValue(status, allowedStatuses);

      if (
        allowedStatuses.length > 0 &&
        !allowedStatuses.some((allowed) => normalizeChoice(allowed) === normalizeChoice(normalizedStatus))
      ) {
        errors.push(
          `Row ${rowNumber}: status "${status}" is not allowed. Use one of: ${allowedStatuses.join(", ")}.`,
        );
      }
    }
  }

  if (section.slug === "game-stats" && errors.length === 0) {
    const playerName = String(row.player || row.Player || row.player_name || row["Player Name"] || "").trim();
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();
    const teamName = String(row.team || row.Team || row.team_slug || row.team_id || "").trim();
    const opponent = String(row.opponent || row.Opponent || "").trim();
    const gameDate = String(row.game_date || row["Game Date"] || row.date || row.Date || "").trim();
    const homeAway = String(row.home_away || row["Home/Away"] || row.homeAway || "").trim();

    if (!(await findPlayerId(playerName))) {
      errors.push(`Row ${rowNumber}: player not found (${playerName}).`);
    }

    if (!(await findGameId({ year, teamName, opponent, gameDate, homeAway }))) {
      errors.push(
        `Row ${rowNumber}: game not found (${teamName} vs ${opponent} on ${gameDate}${homeAway ? `, ${homeAway}` : ""}).`,
      );
    }
  }

  if (section.slug === "season-archive-upload" && errors.length === 0) {
    const year = String(row.year || row.Year || row.season || row.Season || row.season_id || "").trim();

    if (!Number.isInteger(Number(year))) {
      errors.push(`Row ${rowNumber}: year must be a whole number.`);
    }
  }

  return errors;
}

export async function buildUploadPreview(formData: FormData): Promise<UploadPreview> {
  const targetTable = String(formData.get("targetTable") || "");
  const section = uploadSections.find((entry) => entry.uploadTable === targetTable);
  const file = formData.get("file");

  if (!section) {
    throw new Error("Unknown upload target.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV file to preview.");
  }

  const columns = await getTableColumns(targetTable);
  const csvRows = parseCsv(await file.text());
  const headers = csvRows[0] ? Object.keys(csvRows[0]) : [];
  const missingColumns = getRequiredUploadColumns(section, columns).filter((required) => {
    if (section.slug === "calendar" && required === "year") {
      return !headers.some((header) => ["year", "season", "seasonid"].includes(normalizeKey(header)));
    }

    if (section.slug === "calendar" && required === "team") {
      return !headers.some((header) => ["team", "teamslug", "teamid"].includes(normalizeKey(header)));
    }

    if (section.slug === "game-stats" && required === "year") {
      return !headers.some((header) => ["year", "season", "seasonid"].includes(normalizeKey(header)));
    }

    if (section.slug === "game-stats" && required === "team") {
      return !headers.some((header) => ["team", "teamslug", "teamid"].includes(normalizeKey(header)));
    }

    if (section.slug === "game-stats" && required === "game_date") {
      return !headers.some((header) => ["gamedate", "date"].includes(normalizeKey(header)));
    }

    if (
      ["player-assignments", "awards", "calendar", "game-stats", "season-archive-upload"].includes(
        section.slug,
      )
    ) {
      return !headers.some((header) => normalizeKey(header) === normalizeKey(required));
    }

    const targetColumn = getColumnByNormalizedName(columns, required);

    return !headers.some((header) => getColumnByNormalizedName(columns, header)?.name === targetColumn?.name);
  });
  const errors: UploadPreview["errors"] = missingColumns.map((column) => ({
    rowNumber: 1,
    message: `Missing required CSV column: ${column}.`,
  }));

  for (const [index, row] of csvRows.entries()) {
    const rowErrors = await validateUploadRow(section, row, columns, index + 2);
    errors.push(...rowErrors.map((message) => ({ rowNumber: index + 2, message })));
  }

  const invalidRowNumbers = new Set(errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber));

  return {
    targetTable,
    totalRows: csvRows.length,
    validRows: missingColumns.length > 0 ? 0 : csvRows.length - invalidRowNumbers.size,
    invalidRows: missingColumns.length > 0 ? csvRows.length : invalidRowNumbers.size,
    headers,
    errors: errors.slice(0, 50),
  };
}

async function insertUploadLog(
  targetTable: string,
  fileName: string,
  status: string,
  totalRows: number,
  importedRows: number,
  failedRows: number,
) {
  if (!(await tableExists("upload_batches"))) {
    return null;
  }

  const columns = await getTableColumns("upload_batches");
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries({
    target_table: targetTable,
    table_name: targetTable,
    upload_type: "csv_import",
    type: "csv_import",
    file_name: fileName,
    status,
    total_rows: totalRows,
    imported_rows: importedRows,
    success_count: importedRows,
    failed_rows: failedRows,
    failed_count: failedRows,
    uploaded_by: "admin",
  })) {
    if (getColumnByNormalizedName(columns, key)) {
      payload[getColumnByNormalizedName(columns, key)!.name] = value;
    }
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const insertColumns = Object.keys(payload);
  try {
    const result = await dbQuery(
      `insert into public.upload_batches (${insertColumns.map(quoteIdent).join(", ")})
       values (${insertColumns.map((_, index) => `$${index + 1}`).join(", ")})
       returning *`,
      Object.values(payload),
    );

    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function insertUploadErrors(batch: Record<string, unknown> | null, errors: UploadPreview["errors"]) {
  if (errors.length === 0 || !(await tableExists("upload_errors"))) {
    return;
  }

  const columns = await getTableColumns("upload_errors");
  const batchIdColumn = columns.find((column) => normalizeKey(column.name) === "batchid");
  const batchId =
    batchIdColumn && batch
      ? batch.id ?? batch.batch_id ?? batch.upload_batch_id ?? batch[batchIdColumn.name]
      : null;

  for (const error of errors.slice(0, 200)) {
    const payload: Record<string, unknown> = {};

    for (const [key, value] of Object.entries({
      batch_id: batchId,
      row_number: error.rowNumber,
      message: error.message,
      error_message: error.message,
    })) {
      const column = getColumnByNormalizedName(columns, key);

      if (column) {
        payload[column.name] = value;
      }
    }

    if (Object.keys(payload).length > 0) {
      const insertColumns = Object.keys(payload);
      await dbQuery(
        `insert into public.upload_errors (${insertColumns.map(quoteIdent).join(", ")})
         values (${insertColumns.map((_, index) => `$${index + 1}`).join(", ")})`,
        Object.values(payload),
      );
    }
  }
}

export async function importCsvToNeon(formData: FormData) {
  const targetTable = String(formData.get("targetTable") || "");
  const importValidOnly = formData.get("importValidOnly") === "on";
  const section = uploadSections.find((entry) => entry.uploadTable === targetTable);
  const file = formData.get("file");

  if (!section) {
    throw new Error("Unknown upload target.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV file to import.");
  }

  const text = await file.text();
  const columns = await getTableColumns(targetTable);
  const csvRows = parseCsv(text);
  const preview = await buildUploadPreview(formData);

  if (preview.invalidRows > 0 && !importValidOnly) {
    const batch = await insertUploadLog(targetTable, file.name, "failed", preview.totalRows, 0, preview.invalidRows);
    await insertUploadErrors(batch, preview.errors);
    throw new UploadValidationError(
      "CSV contains invalid rows. Preview and fix the row errors before importing.",
      preview,
    );
  }

  const invalidRows = new Set(preview.errors.map((error) => error.rowNumber));
  let importedRows = 0;
  const importErrors: UploadPreview["errors"] = [...preview.errors];

  for (const [index, row] of csvRows.entries()) {
    const rowNumber = index + 2;

    if (invalidRows.has(rowNumber)) {
      continue;
    }

    const payload = await mapCsvRowToColumns(row, columns, targetTable);
    const insertColumns = Object.keys(payload).filter((column) => payload[column] !== undefined);

    if (insertColumns.length === 0) {
      importErrors.push({ rowNumber, message: "No importable columns were found for this row." });
      continue;
    }

    try {
      await dbQuery(
        `insert into public.${quoteIdent(targetTable)} (${insertColumns.map(quoteIdent).join(", ")})
         values (${insertColumns.map((_, valueIndex) => `$${valueIndex + 1}`).join(", ")})`,
        insertColumns.map((column) => payload[column]),
      );
      importedRows += 1;
    } catch (error) {
      importErrors.push({
        rowNumber,
        message: error instanceof Error ? error.message : "Insert failed.",
      });
    }
  }

  const failedRows = Math.max(0, preview.totalRows - importedRows);
  const batch = await insertUploadLog(
    targetTable,
    file.name,
    failedRows > 0 ? "partial" : "success",
    preview.totalRows,
    importedRows,
    failedRows,
  );
  await insertUploadErrors(batch, importErrors);
  revalidateMembersAdmin();

  return {
    importedRows,
    failedRows,
    totalRows: preview.totalRows,
    errors: importErrors.slice(0, 50),
  };
}

export async function refreshPlayerSeasonStats(year?: number, teamSlug?: string) {
  if (year && teamSlug) {
    await dbQuery("select refresh_player_season_stats($1, $2)", [year, teamSlug]);
  } else if (year) {
    await dbQuery("select refresh_player_season_stats($1)", [year]);
  } else {
    await dbQuery("select refresh_player_season_stats()");
  }

  revalidateMembersAdmin();
}

export async function archivePlayerSeasonStats(year: number, archivedBy: string) {
  await dbQuery("select archive_player_season_stats($1, $2)", [year, archivedBy]);
  revalidateMembersAdmin();
}
