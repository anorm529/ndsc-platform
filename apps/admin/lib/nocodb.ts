const DEFAULT_BASE_URL = "https://app.nocodb.com";
const RECORDS_PAGE_SIZE = 100;
const TABLE_CACHE_SECONDS = 30;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 15000;

export type NocoTableConfig = {
  key: string;
  label: string;
  tableId: string;
  accent: "teal" | "blue" | "gold" | "cyan";
  expectedHeaders: string[];
  defaultIdentifierColumns: string;
  defaultMode?: "merge" | "add" | "update" | "delete" | "replace";
  importNote?: string;
};

export type NocoRecord = Record<string, unknown>;

export type NocoField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  readOnly: boolean;
  primary: boolean;
  options: string[];
};

export type NocoTableSnapshot = {
  key: string;
  label: string;
  tableId: string;
  accent: NocoTableConfig["accent"];
  expectedHeaders: string[];
  defaultIdentifierColumns: string;
  defaultMode: NonNullable<NocoTableConfig["defaultMode"]>;
  importNote?: string;
  records: NocoRecord[];
  fields: NocoField[];
  totalRows: number;
  error?: string;
};

type NocoListResponse =
  | NocoRecord[]
  | {
      list?: NocoRecord[];
      pageInfo?: {
        totalRows?: number;
      };
    };

function getBaseUrl() {
  const value = process.env.NOCO_BASE_URL?.trim();
  return value || DEFAULT_BASE_URL;
}

function getApiToken() {
  return process.env.NOCO_API_TOKEN?.trim() || "";
}

export function getConfiguredTables(): NocoTableConfig[] {
  return [
    {
      key: "season-summary",
      label: "Season Player Data",
      tableId: process.env.NOCO_TEAMS_TABLE_ID?.trim() || "",
      accent: "teal",
      expectedHeaders: [
        "teamSlug",
        "sub record id",
        "record id",
        "playerName",
        "Gender",
        "season",
        "division",
        "gamesPlayed",
        "innings",
        "rbi",
        "runs",
        "bb",
        "singles_1b",
        "doubles_2b",
        "triples_3b",
        "hr",
        "batterout",
        "ab",
        "ob",
        "hits",
        "uao",
        "ao",
        "outs",
        "obp",
        "avg",
        "slg",
        "ops",
      ],
      defaultIdentifierColumns: "record id,playerName,season",
      defaultMode: "merge",
      importNote: "Use merge for in-season updates. Matching is based on record id, playerName, and season.",
    },
    {
      key: "calendar",
      label: "Calendar",
      tableId: process.env.NOCO_MATCHES_TABLE_ID?.trim() || "",
      accent: "blue",
      expectedHeaders: [
        "teamSlug",
        "date",
        "opponent",
        "homeAway",
        "location",
        "result",
        "runsFor",
        "runsAgainst",
        "notes",
        "lat",
        "lon",
      ],
      defaultIdentifierColumns: "date,opponent,homeAway",
      defaultMode: "merge",
      importNote: "Calendar rows match on date, opponent, and homeAway.",
    },
    {
      key: "league",
      label: "League Standings",
      tableId: process.env.NOCO_LEAGUE_TABLE_ID?.trim() || "",
      accent: "cyan",
      expectedHeaders: [
        "Team",
        "Position",
        "Division",
        "Points",
        "Win",
        "Loss",
        "Runs Scored",
        "Runs Awarded",
        "Difference",
        "Streak",
        "Year",
      ],
      defaultIdentifierColumns: "Team,Year",
      defaultMode: "replace",
      importNote: "Use replace all rows for league standings so the latest table fully replaces the current season data.",
    },
    {
      key: "awards",
      label: "Awards",
      tableId: process.env.NOCO_AWARDS_TABLE_ID?.trim() || "",
      accent: "gold",
      expectedHeaders: [
        "Player Name",
        "Team",
        "record id",
        "Year",
        "Female MVP",
        "Male MVP",
        "Rookie",
        "Captains Choice",
        "Golden Glove",
        "Spirit Award",
      ],
      defaultIdentifierColumns: "record id",
      defaultMode: "merge",
      importNote: "Awards rows should always include record id for matching.",
    },
    {
      key: "per-game",
      label: "Game Data",
      tableId: process.env.NOCO_PLAYER_GAMES_TABLE_ID?.trim() || "",
      accent: "teal",
      expectedHeaders: [
        "Record id",
        "Game no.",
        "Opponent",
        "Home/Away",
        "Player",
        "Innings",
        "RBI's",
        "Total Runs",
        "BB",
        "1B",
        "2B",
        "3B",
        "HR",
        "Batter out",
        "Total AB",
        "Total OB",
        "OBP",
        "SLG",
        "OPS",
        "UAOs",
        "AOs",
        "Total Outs",
      ],
      defaultIdentifierColumns: "Record id",
      defaultMode: "add",
      importNote: "Per-game data normally appends new rows during the season. Use delete for year-end cleanup.",
    },
  ];
}

export function getActivityLogTableId() {
  return process.env.NOCO_ACTIVITY_LOG_TABLE_ID?.trim() || "";
}

export function getNocoConfigWarnings() {
  const warnings: string[] = [];

  if (!getApiToken()) {
    warnings.push("`NOCO_API_TOKEN` is missing. Read-only and write actions are disabled.");
  }

  const missingTables = getConfiguredTables()
    .filter((table) => !table.tableId)
    .map((table) => table.label);

  if (missingTables.length > 0) {
    warnings.push(`Missing table IDs for: ${missingTables.join(", ")}.`);
  }

  return warnings;
}

function getHeaders() {
  const token = getApiToken();

  if (!token) {
    throw new Error("Missing NOCO_API_TOKEN.");
  }

  return {
    "Content-Type": "application/json",
    "xc-token": token,
  };
}

export function getTableCacheTag(tableId: string) {
  return `noco-table:${tableId}`;
}

async function nocoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        ...getHeaders(),
        ...(init?.headers || {}),
      },
      cache: init?.method && init.method !== "GET" ? "no-store" : "force-cache",
    });

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      const retryAfter = Number(response.headers.get("retry-after") || "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `NocoDB request failed (${response.status}).`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  throw new Error("NocoDB request failed after retries.");
}

function normalizeListResponse(payload: NocoListResponse) {
  if (Array.isArray(payload)) {
    return {
      records: payload,
      totalRows: payload.length,
    };
  }

  return {
    records: payload.list || [],
    totalRows: payload.pageInfo?.totalRows ?? payload.list?.length ?? 0,
  };
}

function sanitizeFieldLabel(value: string) {
  return value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function inferType(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? "Number" : "Decimal";
  }

  if (typeof value === "boolean") {
    return "Checkbox";
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "Date";
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return "DateTime";
    }
  }

  return "SingleLineText";
}

function inferFieldsFromRecords(records: NocoRecord[]) {
  const fields = new Map<string, NocoField>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (key === "Id" || key === "id" || key === "ID") {
        continue;
      }

      if (!fields.has(key)) {
        fields.set(key, {
          key,
          label: sanitizeFieldLabel(key),
          type: inferType(value),
          required: false,
          readOnly: false,
          primary: false,
          options: [],
        });
      }
    }
  }

  return Array.from(fields.values());
}

export function getRecordId(record: NocoRecord) {
  const value = record.Id ?? record.id ?? record.ID;
  return value == null ? "" : String(value);
}

function normalizeOptions(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "title" in item && typeof item.title === "string") {
        return item.title;
      }

      return "";
    })
    .filter(Boolean);
}

function mapFieldDefinition(field: Record<string, unknown>, records: NocoRecord[]) {
  const meta =
    field.meta && typeof field.meta === "object"
      ? (field.meta as { options?: unknown })
      : undefined;
  const candidateKeys = [
    typeof field.column_name === "string" ? field.column_name : "",
    typeof field.columnName === "string" ? field.columnName : "",
    typeof field.title === "string" ? field.title : "",
    typeof field.name === "string" ? field.name : "",
  ].filter(Boolean);
  const key =
    candidateKeys.find((candidate) => records.some((record) => candidate in record)) ||
    candidateKeys[0] ||
    "";

  if (!key || key === "Id" || key === "id" || key === "ID") {
    return null;
  }

  return {
    key,
    label:
      (typeof field.title === "string" && field.title) ||
      (typeof field.column_name === "string" && sanitizeFieldLabel(field.column_name)) ||
      sanitizeFieldLabel(key),
    type:
      (typeof field.uidt === "string" && field.uidt) ||
      (typeof field.type === "string" && field.type) ||
      inferType(records.find((record) => key in record)?.[key]),
    required: Boolean(field.rqd ?? field.required),
    readOnly: Boolean(field.readonly ?? field.readOnly ?? field.system),
    primary: Boolean(field.pk ?? field.primary),
    options: normalizeOptions(field.dtxp ?? field.options ?? meta?.options),
  } satisfies NocoField;
}

async function listTableFields(tableId: string, records: NocoRecord[]) {
  const endpoints = [
    `/api/v2/meta/tables/${tableId}`,
    `/api/v2/meta/tables/${tableId}/columns`,
    `/api/v1/db/meta/tables/${tableId}/columns`,
  ];

  for (const path of endpoints) {
    try {
      const payload = await nocoFetch<Record<string, unknown> | Record<string, unknown>[]>(path);
      const rawFields = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.columns)
          ? payload.columns
          : Array.isArray(payload.fields)
            ? payload.fields
            : [];

      if (rawFields.length === 0) {
        continue;
      }

      const fields = rawFields
        .map((field) => mapFieldDefinition(field, records))
        .filter((field): field is NocoField => Boolean(field));

      if (fields.length > 0) {
        return fields;
      }
    } catch {
      continue;
    }
  }

  return inferFieldsFromRecords(records);
}

export function getRecordValue(record: NocoRecord, field: NocoField) {
  return record[field.key];
}

export function getEditableFields(fields: NocoField[]) {
  const blockedTypes = new Set([
    "Formula",
    "Rollup",
    "Lookup",
    "QrCode",
    "Barcode",
    "CreatedTime",
    "LastModifiedTime",
    "AutoNumber",
  ]);

  return fields.filter((field) => !field.primary && !field.readOnly && !blockedTypes.has(field.type));
}

async function fetchTablePage(tableId: string, limit: number, offset: number) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const response = await fetch(
      `${getBaseUrl()}/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "force-cache",
        next: {
          revalidate: TABLE_CACHE_SECONDS,
          tags: [getTableCacheTag(tableId)],
        },
      },
    );

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      const retryAfter = Number(response.headers.get("retry-after") || "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `NocoDB request failed (${response.status}).`);
    }

    const payload = (await response.json()) as NocoListResponse;
    return normalizeListResponse(payload);
  }

  throw new Error("NocoDB table fetch failed after retries.");
}

export async function listTablePageRecords(tableId: string, limit = RECORDS_PAGE_SIZE, offset = 0) {
  return fetchTablePage(tableId, limit, offset);
}

export async function listTableRecords(tableId: string, limit = RECORDS_PAGE_SIZE) {
  let offset = 0;
  let totalRows = 0;
  const records: NocoRecord[] = [];

  while (true) {
    const page = await fetchTablePage(tableId, limit, offset);

    if (offset === 0) {
      totalRows = page.totalRows;
    }

    records.push(...page.records);

    if (page.records.length < limit || records.length >= totalRows) {
      break;
    }

    offset += limit;
  }

  return {
    records,
    totalRows: totalRows || records.length,
  };
}

export async function getTableOverview(tableId: string) {
  return fetchTablePage(tableId, 1, 0);
}

export async function createTableRecord(tableId: string, payload: Record<string, unknown>) {
  return nocoFetch(`/api/v2/tables/${tableId}/records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTableRecord(
  tableId: string,
  recordId: string,
  payload: Record<string, unknown>,
) {
  return nocoFetch(`/api/v2/tables/${tableId}/records`, {
    method: "PATCH",
    body: JSON.stringify([
      {
        Id: recordId,
        ...payload,
      },
    ]),
  });
}

export async function deleteTableRecord(tableId: string, recordId: string) {
  return nocoFetch(`/api/v2/tables/${tableId}/records/${recordId}`, {
    method: "DELETE",
  });
}

async function buildTableSnapshot(table: NocoTableConfig) {
  if (!table.tableId) {
    return {
      ...table,
      records: [],
      fields: [],
      totalRows: 0,
      defaultMode: table.defaultMode || "merge",
      error: "Missing table ID.",
    } satisfies NocoTableSnapshot;
  }

  try {
    const overview = await getTableOverview(table.tableId);
    const fields = await listTableFields(table.tableId, overview.records);

    return {
      ...table,
      records: [],
      fields,
      totalRows: overview.totalRows,
      defaultMode: table.defaultMode || "merge",
      error: undefined,
    } satisfies NocoTableSnapshot;
  } catch (error) {
    return {
      ...table,
      records: [],
      fields: [],
      totalRows: 0,
      defaultMode: table.defaultMode || "merge",
      error: error instanceof Error ? error.message : "Unable to load table.",
    } satisfies NocoTableSnapshot;
  }
}

export async function getTableSnapshot(tableKey: string) {
  const warnings = getNocoConfigWarnings();
  const table = getConfiguredTables().find((entry) => entry.key === tableKey);

  if (!table) {
    return {
      warnings,
      tables: [] as NocoTableSnapshot[],
    };
  }

  if (warnings.some((warning) => warning.includes("NOCO_API_TOKEN"))) {
    return {
      warnings,
      tables: [
        {
          ...table,
          records: [],
          fields: [],
          totalRows: 0,
          defaultMode: table.defaultMode || "merge",
          error: "Waiting for NocoDB credentials.",
        },
      ] satisfies NocoTableSnapshot[],
    };
  }

  return {
    warnings,
    tables: [await buildTableSnapshot(table)],
  };
}

export async function getDashboardSnapshot() {
  const warnings = getNocoConfigWarnings();
  const configuredTables = getConfiguredTables();

  if (warnings.some((warning) => warning.includes("NOCO_API_TOKEN"))) {
    return {
      warnings,
      tables: configuredTables.map<NocoTableSnapshot>((table) => ({
        ...table,
        records: [],
        fields: [],
        totalRows: 0,
        defaultMode: table.defaultMode || "merge",
        error: "Waiting for NocoDB credentials.",
      })),
    };
  }

  const tables = await Promise.all(
    configuredTables.map((table) => buildTableSnapshot(table)),
  );

  return {
    warnings,
    tables,
  };
}
