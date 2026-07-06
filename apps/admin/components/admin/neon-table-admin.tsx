"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import {
  createNeonRecordAction,
  deleteNeonRecordAction,
  updateNeonRecordAction,
} from "@/app/members/admin/actions";
import type { DbColumn, FieldOption, TableAdminData } from "@/lib/neon-admin";

function formatValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function resolveDisplayValue(
  column: DbColumn,
  value: unknown,
  relationOptions: Record<string, FieldOption[]>,
) {
  const raw = formatValue(value);
  const options = relationOptions[column.name];
  if (options && raw) {
    const match = options.find((opt) => opt.value === raw);
    if (match) return match.label;
  }
  return raw;
}

function inputType(column: DbColumn) {
  if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(column.udtName)) {
    return "number";
  }

  if (column.udtName === "date") {
    return "date";
  }

  if (column.udtName === "bool") {
    return "checkbox";
  }

  return "text";
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

function FieldInput({
  column,
  value,
  options,
}: {
  column: DbColumn;
  value?: unknown;
  options?: FieldOption[];
}) {
  const type = inputType(column);
  const baseClass =
    "h-10 w-full rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white outline-none focus:border-[color:var(--accent)]";
  const currentValue = formatValue(value);

  if (options) {
    const hasCurrentValue = currentValue && options.some((option) => option.value === currentValue);

    return (
      <select
        name={`field:${column.name}`}
        defaultValue={currentValue}
        className={baseClass}
      >
        <option value="">
          {options.length > 0 ? `Choose ${column.name.replace(/_id$/, "")}` : "No available options"}
        </option>
        {hasCurrentValue ? null : currentValue ? (
          <option value={currentValue}>{currentValue}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "checkbox") {
    return (
      <>
        <input
          name={`field:${column.name}`}
          type="checkbox"
          value="true"
          defaultChecked={Boolean(value)}
          className="h-5 w-5 rounded border-[color:var(--border)] bg-[#071525]"
        />
        <input type="hidden" name={`field:${column.name}`} value="false" />
      </>
    );
  }

  return (
    <input
      name={`field:${column.name}`}
      type={type}
      step={type === "number" ? "any" : undefined}
      defaultValue={formatValue(value)}
      className={baseClass}
    />
  );
}

function TableFormFields({
  columns,
  row,
  includePrimary,
  relationOptions,
}: {
  columns: DbColumn[];
  row?: Record<string, unknown>;
  includePrimary: boolean;
  relationOptions: Record<string, FieldOption[]>;
}) {
  const editableColumns = columns.filter(
    (column) =>
      !column.identity &&
      !column.generated &&
      !isSystemManagedColumn(column) &&
      (includePrimary || !column.primary),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {editableColumns.map((column) => (
        <label key={column.name} className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#93a0b3]">
            {column.name}
            {!column.nullable && !column.hasDefault ? " *" : ""}
          </span>
          <FieldInput
            column={column}
            value={row?.[column.name]}
            options={relationOptions[column.name]}
          />
        </label>
      ))}
    </div>
  );
}

function HiddenPrimaryKeys({
  columns,
  row,
}: {
  columns: DbColumn[];
  row: Record<string, unknown>;
}) {
  return (
    <>
      {columns
        .filter((column) => column.primary)
        .map((column) => (
          <input
            key={column.name}
            type="hidden"
            name={`pk:${column.name}`}
            value={formatValue(row[column.name])}
          />
        ))}
    </>
  );
}

export function NeonTableAdmin({
  table,
  collapsibleGroups = false,
  hiddenColumns = [],
}: {
  table: TableAdminData;
  collapsibleGroups?: boolean;
  hiddenColumns?: string[];
}) {
  const primaryKeyCount = table.columns.filter((column) => column.primary).length;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const playerIdColumn = table.columns.find((c) => c.name === "player_id");
  const gameIdColumn = table.columns.find((c) => c.name === "game_id");
  const groupByPlayer = Boolean(playerIdColumn && table.relationOptions.player_id?.length);
  const useCollapsibleGroups = collapsibleGroups && groupByPlayer;

  const hidden = new Set(hiddenColumns);
  if (useCollapsibleGroups) {
    hidden.add("player_id");
  }
  const visibleColumns = table.columns.filter((column) => !hidden.has(column.name)).slice(0, 8);
  const colSpan = visibleColumns.length + 1;

  const rowKey = (row: Record<string, unknown>, fallback: string) => {
    const pkValue = table.columns
      .filter((column) => column.primary)
      .map((column) => formatValue(row[column.name]))
      .join(":");
    return pkValue || fallback;
  };

  const playerNameForRow = (row: Record<string, unknown>) =>
    playerIdColumn
      ? resolveDisplayValue(playerIdColumn, row.player_id, table.relationOptions) || "Unknown player"
      : "";

  const gameSortValue = (row: Record<string, unknown>) =>
    gameIdColumn ? resolveDisplayValue(gameIdColumn, row.game_id, table.relationOptions) : "";

  const toggleGroup = (name: string) =>
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

  if (table.error) {
    return (
      <section className="admin-panel rounded-[1.5rem] p-5 text-sm text-[color:var(--danger)]">
        {table.error}
      </section>
    );
  }

  if (!table.exists) {
    return (
      <section className="admin-panel rounded-[1.5rem] p-5">
        <h2 className="text-xl font-semibold text-white">{table.tableName}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          This table was not found in the connected Neon database.
        </p>
      </section>
    );
  }

  const renderBodyRows = (rows: Array<Record<string, unknown>>, keyPrefix: string) =>
    rows.map((row, index) => {
      const key = rowKey(row, `${keyPrefix}-${index}`);

      return (
        <Fragment key={key}>
          <tr className="bg-[#061321]/80 text-[#dce5f2]">
            {visibleColumns.map((column) => (
              <td key={column.name} className="max-w-[280px] truncate px-3 py-3">
                {resolveDisplayValue(column, row[column.name], table.relationOptions) || "-"}
              </td>
            ))}
            <td className="px-3 py-3">
              <button
                type="button"
                onClick={() => setEditingRowKey((current) => (current === key ? null : key))}
                className="inline-flex items-center gap-2 text-[color:var(--accent)]"
              >
                {editingRowKey === key ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Edit
              </button>
            </td>
          </tr>
          {editingRowKey === key ? (
            <tr>
              <td colSpan={colSpan} className="pb-3 pt-0">
                <div className="rounded-xl border border-[color:var(--border)] bg-[#020913] p-4">
                  <form action={updateNeonRecordAction} className="space-y-4">
                    <input type="hidden" name="tableName" value={table.tableName} />
                    <HiddenPrimaryKeys columns={table.columns} row={row} />
                    <TableFormFields
                      columns={table.columns}
                      row={row}
                      includePrimary={false}
                      relationOptions={table.relationOptions}
                    />
                    <button
                      disabled={primaryKeyCount === 0}
                      className="h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save
                    </button>
                  </form>

                  <form action={deleteNeonRecordAction} className="mt-5 flex flex-wrap items-end gap-3 border-t border-[color:var(--border)] pt-4">
                    <input type="hidden" name="tableName" value={table.tableName} />
                    <HiddenPrimaryKeys columns={table.columns} row={row} />
                    <label className="space-y-1">
                      <span className="block text-xs text-[#93a0b3]">Type DELETE</span>
                      <input
                        name="confirmation"
                        className="h-10 rounded-lg border border-[rgba(239,75,95,0.35)] bg-[#071525] px-3 text-sm text-white"
                      />
                    </label>
                    <button
                      disabled={primaryKeyCount === 0}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[rgba(239,75,95,0.45)] px-4 text-sm font-semibold text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ) : null}
        </Fragment>
      );
    });

  const tableHeader = (
    <thead className="text-xs uppercase tracking-[0.12em] text-[#91a0b5]">
      <tr>
        {visibleColumns.map((column) => (
          <th key={column.name} className="px-3 py-2">
            {column.name}
          </th>
        ))}
        <th className="px-3 py-2">Actions</th>
      </tr>
    </thead>
  );

  let playerGroups: Array<[string, Array<Record<string, unknown>>]> = [];

  if (useCollapsibleGroups) {
    const map = new Map<string, Array<Record<string, unknown>>>();
    for (const row of table.rows) {
      const name = playerNameForRow(row);
      const existing = map.get(name) ?? [];
      existing.push(row);
      map.set(name, existing);
    }
    playerGroups = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => [
        name,
        [...rows].sort((a, b) => gameSortValue(a).localeCompare(gameSortValue(b))),
      ]);
  }

  const flatRows = groupByPlayer
    ? [...table.rows].sort((a, b) => playerNameForRow(a).localeCompare(playerNameForRow(b)))
    : table.rows;

  return (
    <section className="admin-panel rounded-[1.5rem] p-5">
      <div className="flex flex-col gap-2 border-b border-[color:var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{table.tableName}</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {table.rows.length < table.totalRows
              ? `${table.totalRows} rows. Showing latest ${table.rows.length}.`
              : `${table.totalRows} rows.`}
            {useCollapsibleGroups ? ` ${playerGroups.length} players.` : ""}
          </p>
        </div>
        {primaryKeyCount === 0 ? (
          <p className="rounded-full border border-[rgba(245,184,76,0.35)] px-3 py-1 text-xs text-[#f5c26b]">
            Add a primary key to enable safe update/delete.
          </p>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[#061321]/70 p-4">
        <button
          type="button"
          onClick={() => setShowAddForm((current) => !current)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]"
        >
          {showAddForm ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Add row
        </button>
        {showAddForm ? (
          <form action={createNeonRecordAction} className="mt-4 space-y-4">
            <input type="hidden" name="tableName" value={table.tableName} />
            <TableFormFields
              columns={table.columns}
              includePrimary
              relationOptions={table.relationOptions}
            />
            <button className="h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d]">
              Create
            </button>
          </form>
        ) : null}
      </div>

      {useCollapsibleGroups ? (
        <div className="mt-5 space-y-3">
          {playerGroups.map(([name, rows]) => {
            const expanded = expandedGroups.has(name);

            return (
              <div
                key={name}
                className="rounded-xl border border-[color:var(--border)] bg-[#061321]/70"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(name)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-[color:var(--accent)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[color:var(--accent)]" />
                    )}
                    {name}
                  </span>
                  <span className="text-xs text-[#93a0b3]">
                    {rows.length} game{rows.length === 1 ? "" : "s"}
                  </span>
                </button>
                {expanded ? (
                  <div className="overflow-x-auto px-4 pb-4">
                    <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                      {tableHeader}
                      <tbody>{renderBodyRows(rows, name)}</tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
          {playerGroups.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">No rows yet.</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            {tableHeader}
            <tbody>
              {flatRows.map((row, index) => {
                const prevRow = flatRows[index - 1];
                const currentPlayerName = groupByPlayer ? playerNameForRow(row) : null;
                const prevPlayerName = groupByPlayer && prevRow ? playerNameForRow(prevRow) : null;
                const isNewGroup = groupByPlayer && currentPlayerName !== prevPlayerName;

                return (
                  <Fragment key={rowKey(row, `flat-${index}`)}>
                    {isNewGroup ? (
                      <tr>
                        <td colSpan={colSpan} className="px-3 pb-1 pt-4">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                            {currentPlayerName}
                          </span>
                        </td>
                      </tr>
                    ) : null}
                    {renderBodyRows([row], `flat-${index}`)}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
