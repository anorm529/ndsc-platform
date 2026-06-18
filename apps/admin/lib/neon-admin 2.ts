import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCsv, type CsvRow } from "@/lib/csv";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

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

export type TableAdminData = {
  tableName: string;
  exists: boolean;
  columns: DbColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
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
    description: "Manage players and assign them to teams/seasons.",
    tables: ["players", "player_team_seasons"],
    uploadTable: "players",
    uploadRequired: ["player"],
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
  batterout: ["batter_out", "batterout"],
  ab: ["ab", "at_bats", "atbats"],
  atbats: ["at_bats", "atbats", "ab"],
  uaos: ["uaos", "uao"],
  uao: ["uao", "uaos"],
  aos: ["aos", "ao"],
  ao: ["ao", "aos"],
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

function getSectionBySlug(slug: string) {
  return neonAdminSections.find((section) => section.slug === slug);
}

function getSectionForTable(tableName: string) {
  return neonAdminSections.find((section) => section.tables.includes(tableName));
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

  return value;
}

function editableColumns(columns: DbColumn[]) {
  return columns.filter((column) => !column.identity && !column.generated);
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

function getRequiredUploadColumns(section: NeonAdminSection, columns: DbColumn[]) {
  return (section.uploadRequired || []).filter((required) => getColumnByNormalizedName(columns, required));
}

export function getNeonAdminSection(slug: string) {
  return getSectionBySlug(slug);
}

export async function getDatabaseOverview() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      tables: [] as Array<{ tableName: string; exists: boolean; totalRows: number | null }>,
    };
  }

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

  return { configured: true, tables };
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
      error: "DATABASE_URL is not configured.",
    };
  }

  try {
    const exists = await tableExists(tableName);

    if (!exists) {
      return { tableName, exists, columns: [], rows: [], totalRows: 0 };
    }

    const columns = await getTableColumns(tableName);
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
    };
  } catch (error) {
    return {
      tableName,
      exists: false,
      columns: [],
      rows: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : "Unable to read table.",
    };
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

function mapCsvRowToColumns(row: CsvRow, columns: DbColumn[]) {
  const payload: Record<string, unknown> = {};

  for (const [header, rawValue] of Object.entries(row)) {
    const column = getColumnByNormalizedName(columns, header);

    if (!column || column.identity || column.generated) {
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
    const matchingHeader = column
      ? Object.keys(row).find((key) => getColumnByNormalizedName(columns, key)?.name === column.name)
      : "";
    const value = matchingHeader ? row[matchingHeader] : "";

    if (!String(value || "").trim()) {
      errors.push(`Row ${rowNumber}: missing ${required}.`);
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
  const result = await dbQuery(
    `insert into public.upload_batches (${insertColumns.map(quoteIdent).join(", ")})
     values (${insertColumns.map((_, index) => `$${index + 1}`).join(", ")})
     returning *`,
    Object.values(payload),
  );

  return result.rows[0] || null;
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
    throw new Error("CSV contains invalid rows. Preview and fix the row errors before importing.");
  }

  const invalidRows = new Set(preview.errors.map((error) => error.rowNumber));
  let importedRows = 0;
  const importErrors: UploadPreview["errors"] = [...preview.errors];

  for (const [index, row] of csvRows.entries()) {
    const rowNumber = index + 2;

    if (invalidRows.has(rowNumber)) {
      continue;
    }

    const payload = mapCsvRowToColumns(row, columns);
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

  return { importedRows, failedRows, totalRows: preview.totalRows };
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
