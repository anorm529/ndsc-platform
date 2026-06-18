import { parseCsv, type CsvRow } from "@/lib/csv";
import {
  createTableRecord,
  deleteTableRecord,
  getRecordId,
  listTableRecords,
  updateTableRecord,
} from "@/lib/nocodb";

export type ImportMode = "merge" | "add" | "update" | "delete" | "replace";

export type ImportPreview = {
  totalRows: number;
  toAdd: number;
  toUpdate: number;
  toDelete: number;
  unchanged: number;
  missingIdentifiers: number;
  duplicateIdentifiers: number;
  warnings: string[];
};

function normalizeColumnKey(value: string) {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function getValueByColumn(record: Record<string, unknown>, column: string) {
  if (column in record) {
    return record[column];
  }

  const normalizedColumn = normalizeColumnKey(column);

  for (const [key, value] of Object.entries(record)) {
    if (normalizeColumnKey(key) === normalizedColumn) {
      return value;
    }
  }

  return undefined;
}

function sanitizePayload(row: Record<string, string>, identifierColumns: string[]) {
  const payload: Record<string, unknown> = {};
  const normalizedIdentifierColumns = new Set(identifierColumns.map(normalizeColumnKey));
  const blockedColumns = new Set([
    "id",
    "createdat",
    "updatedat",
    "uploaded",
    "createdtime",
    "lastmodifiedtime",
  ]);

  for (const [key, value] of Object.entries(row)) {
    if (
      normalizedIdentifierColumns.has(normalizeColumnKey(key)) ||
      blockedColumns.has(normalizeColumnKey(key))
    ) {
      continue;
    }

    payload[key] = value.trim() === "" ? null : value;
  }

  return payload;
}

function buildCompositeKey(record: Record<string, unknown>, identifierColumns: string[]) {
  return identifierColumns
    .map((column) => String(getValueByColumn(record, column) ?? "").trim().toLowerCase())
    .join("::");
}

function usesCompositeLookup(mode: ImportMode, identifierColumns: string[]) {
  return (
    mode !== "add" &&
    !(
      identifierColumns.length === 1 &&
      ["id", "Id", "ID"].includes(identifierColumns[0])
    )
  );
}

function getIdentifierForRow(
  row: CsvRow,
  identifierColumns: string[],
  recordIdByCompositeKey: Map<string, string>,
  useCompositeLookup: boolean,
) {
  if (useCompositeLookup) {
    return recordIdByCompositeKey.get(buildCompositeKey(row, identifierColumns)) || "";
  }

  return String(
    getValueByColumn(row, identifierColumns[0]) ?? row.Id ?? row.id ?? row.ID ?? "",
  ).trim();
}

async function getExistingContext(
  tableId: string,
  mode: ImportMode,
  identifierColumns: string[],
) {
  const shouldLoadExisting = mode !== "add";

  if (!shouldLoadExisting) {
    return {
      existingRecords: null,
      recordIdByCompositeKey: new Map<string, string>(),
      useCompositeLookup: false,
    };
  }

  const existingRecords = await listTableRecords(tableId);
  const useComposite = usesCompositeLookup(mode, identifierColumns);
  const recordIdByCompositeKey = new Map<string, string>();

  if (useComposite) {
    for (const record of existingRecords.records) {
      const recordId = getRecordId(record);

      if (!recordId) {
        continue;
      }

      recordIdByCompositeKey.set(buildCompositeKey(record, identifierColumns), recordId);
    }
  }

  return {
    existingRecords,
    recordIdByCompositeKey,
    useCompositeLookup: useComposite,
  };
}

export async function buildImportPreview(
  tableId: string,
  csvText: string,
  mode: ImportMode,
  identifierColumns: string[],
) {
  const rows = parseCsv(csvText);
  const { existingRecords, recordIdByCompositeKey, useCompositeLookup } =
    await getExistingContext(tableId, mode, identifierColumns);
  const seenIdentifiers = new Set<string>();

  let toAdd = 0;
  let toUpdate = 0;
  let toDelete = 0;
  const unchanged = 0;
  let missingIdentifiers = 0;
  let duplicateIdentifiers = 0;

  for (const row of rows) {
    const identifier = getIdentifierForRow(
      row,
      identifierColumns,
      recordIdByCompositeKey,
      useCompositeLookup,
    );
    const identityKey = useCompositeLookup
      ? buildCompositeKey(row, identifierColumns)
      : identifier;

    if (mode !== "add" && !identifier) {
      missingIdentifiers += 1;
      continue;
    }

    if (identityKey) {
      if (seenIdentifiers.has(identityKey)) {
        duplicateIdentifiers += 1;
      } else {
        seenIdentifiers.add(identityKey);
      }
    }

    if (mode === "add") {
      toAdd += 1;
      continue;
    }

    if (mode === "update") {
      toUpdate += 1;
      continue;
    }

    if (mode === "delete") {
      toDelete += 1;
      continue;
    }

    if (mode === "replace") {
      toAdd += 1;
      continue;
    }

    if (mode === "merge") {
      if (identifier) {
        toUpdate += 1;
      } else {
        toAdd += 1;
      }
    }
  }

  if (mode === "replace" && existingRecords) {
    toDelete = existingRecords.records.filter((record) => Boolean(getRecordId(record))).length;
  }

  const warnings: string[] = [];

  if (missingIdentifiers > 0) {
    warnings.push(`${missingIdentifiers} row(s) are missing the required identifier values.`);
  }

  if (duplicateIdentifiers > 0) {
    warnings.push(`${duplicateIdentifiers} duplicate identifier row(s) were found in the CSV.`);
  }

  if (mode === "replace") {
    warnings.push("Replace all rows will delete the current table rows before importing the CSV.");
  }

  return {
    totalRows: rows.length,
    toAdd,
    toUpdate,
    toDelete,
    unchanged,
    missingIdentifiers,
    duplicateIdentifiers,
    warnings,
  } satisfies ImportPreview;
}

export async function executeImport(
  tableId: string,
  csvText: string,
  mode: ImportMode,
  identifierColumns: string[],
) {
  const rows = parseCsv(csvText);
  const { existingRecords, recordIdByCompositeKey, useCompositeLookup } =
    await getExistingContext(tableId, mode, identifierColumns);

  if (mode === "replace") {
    const currentRecords = existingRecords ?? (await listTableRecords(tableId));

    for (const record of currentRecords.records) {
      const recordId = getRecordId(record);

      if (!recordId) {
        continue;
      }

      await deleteTableRecord(tableId, recordId);
    }

    for (const row of rows) {
      const payload = sanitizePayload(row, identifierColumns);
      await createTableRecord(tableId, payload);
    }

    return;
  }

  for (const row of rows) {
    const identifier = getIdentifierForRow(
      row,
      identifierColumns,
      recordIdByCompositeKey,
      useCompositeLookup,
    );
    const payload = sanitizePayload(row, identifierColumns);

    if (mode === "add") {
      await createTableRecord(tableId, payload);
      continue;
    }

    if (mode === "update") {
      if (!identifier) {
        continue;
      }

      await updateTableRecord(tableId, identifier, payload);
      continue;
    }

    if (mode === "delete") {
      if (!identifier) {
        continue;
      }

      await deleteTableRecord(tableId, identifier);
      continue;
    }

    if (mode === "merge") {
      if (identifier) {
        await updateTableRecord(tableId, identifier, payload);
      } else {
        await createTableRecord(tableId, payload);
      }
    }
  }
}
