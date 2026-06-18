import {
  createTableRecord,
  getActivityLogTableId,
  listTablePageRecords,
  type NocoRecord,
} from "@/lib/nocodb";

export type ActivityLogEntry = {
  id: string;
  timestamp: string;
  tableId: string;
  tableLabel: string;
  mode: string;
  status: "success" | "error";
  totalRows: number;
  toAdd: number;
  toUpdate: number;
  toDelete: number;
  message: string;
  identifierColumns?: string;
  warnings?: string;
  importFileName?: string;
};

type CreateActivityLogEntry = Omit<ActivityLogEntry, "id">;

function normalizeKey(value: string) {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function getRecordValue(record: NocoRecord, key: string) {
  if (key in record) {
    return record[key];
  }

  const normalizedKey = normalizeKey(key);

  for (const [recordKey, recordValue] of Object.entries(record)) {
    if (normalizeKey(recordKey) === normalizedKey) {
      return recordValue;
    }
  }

  return undefined;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapActivityLogRecord(record: NocoRecord): ActivityLogEntry {
  return {
    id: String(record.Id ?? record.id ?? record.ID ?? ""),
    timestamp: String(getRecordValue(record, "timestamp") ?? ""),
    tableId: String(getRecordValue(record, "tableId") ?? ""),
    tableLabel: String(getRecordValue(record, "tableLabel") ?? ""),
    mode: String(getRecordValue(record, "mode") ?? ""),
    status:
      String(getRecordValue(record, "status") ?? "success") === "error" ? "error" : "success",
    totalRows: toNumber(getRecordValue(record, "totalRows")),
    toAdd: toNumber(getRecordValue(record, "toAdd")),
    toUpdate: toNumber(getRecordValue(record, "toUpdate")),
    toDelete: toNumber(getRecordValue(record, "toDelete")),
    message: String(getRecordValue(record, "message") ?? ""),
    identifierColumns: String(getRecordValue(record, "identifierColumns") ?? ""),
    warnings: String(getRecordValue(record, "warnings") ?? ""),
    importFileName: String(getRecordValue(record, "importFileName") ?? ""),
  };
}

export async function appendActivityLog(entry: CreateActivityLogEntry) {
  const tableId = getActivityLogTableId();

  if (!tableId) {
    return;
  }

  try {
    await createTableRecord(tableId, {
      timestamp: entry.timestamp,
      tableId: entry.tableId,
      tableLabel: entry.tableLabel,
      mode: entry.mode,
      status: entry.status,
      totalRows: entry.totalRows,
      toAdd: entry.toAdd,
      toUpdate: entry.toUpdate,
      toDelete: entry.toDelete,
      message: entry.message,
      identifierColumns: entry.identifierColumns ?? null,
      warnings: entry.warnings ?? null,
      importFileName: entry.importFileName ?? null,
    });
  } catch {
    return;
  }
}

export async function listActivityLogs(limit = 50) {
  const tableId = getActivityLogTableId();

  if (!tableId) {
    return [] as ActivityLogEntry[];
  }

  try {
    const { records } = await listTablePageRecords(tableId, limit, 0);

    return records
      .map(mapActivityLogRecord)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, limit);
  } catch {
    return [] as ActivityLogEntry[];
  }
}

export async function getRecentActivityCount(hours = 24) {
  try {
    const entries = await listActivityLogs(100);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return entries.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff).length;
  } catch {
    return 0;
  }
}
