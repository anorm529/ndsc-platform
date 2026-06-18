import { Trash2 } from "lucide-react";
import {
  createNeonRecordAction,
  deleteNeonRecordAction,
  updateNeonRecordAction,
} from "@/app/members/admin/actions";
import type { DbColumn, TableAdminData } from "@/lib/neon-admin";

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

function FieldInput({
  column,
  value,
}: {
  column: DbColumn;
  value?: unknown;
}) {
  const type = inputType(column);
  const baseClass =
    "h-10 w-full rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white outline-none focus:border-[color:var(--accent)]";

  if (type === "checkbox") {
    return (
      <input
        name={`field:${column.name}`}
        type="checkbox"
        defaultChecked={Boolean(value)}
        className="h-5 w-5 rounded border-[color:var(--border)] bg-[#071525]"
      />
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
}: {
  columns: DbColumn[];
  row?: Record<string, unknown>;
  includePrimary: boolean;
}) {
  const editableColumns = columns.filter(
    (column) => !column.identity && !column.generated && (includePrimary || !column.primary),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {editableColumns.map((column) => (
        <label key={column.name} className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#93a0b3]">
            {column.name}
            {!column.nullable && !column.hasDefault ? " *" : ""}
          </span>
          <FieldInput column={column} value={row?.[column.name]} />
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

export function NeonTableAdmin({ table }: { table: TableAdminData }) {
  const primaryKeyCount = table.columns.filter((column) => column.primary).length;

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

  return (
    <section className="admin-panel rounded-[1.5rem] p-5">
      <div className="flex flex-col gap-2 border-b border-[color:var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{table.tableName}</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {table.totalRows} rows. Showing latest 100.
          </p>
        </div>
        {primaryKeyCount === 0 ? (
          <p className="rounded-full border border-[rgba(245,184,76,0.35)] px-3 py-1 text-xs text-[#f5c26b]">
            Add a primary key to enable safe update/delete.
          </p>
        ) : null}
      </div>

      <details className="mt-5 rounded-xl border border-[color:var(--border)] bg-[#061321]/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--accent)]">
          Add row
        </summary>
        <form action={createNeonRecordAction} className="mt-4 space-y-4">
          <input type="hidden" name="tableName" value={table.tableName} />
          <TableFormFields columns={table.columns} includePrimary />
          <button className="h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d]">
            Create
          </button>
        </form>
      </details>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[#91a0b5]">
            <tr>
              {table.columns.slice(0, 8).map((column) => (
                <th key={column.name} className="px-3 py-2">
                  {column.name}
                </th>
              ))}
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={index} className="bg-[#061321]/80 text-[#dce5f2]">
                {table.columns.slice(0, 8).map((column) => (
                  <td key={column.name} className="max-w-[220px] truncate px-3 py-3">
                    {formatValue(row[column.name]) || "-"}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <details>
                    <summary className="cursor-pointer text-[color:var(--accent)]">Edit</summary>
                    <div className="mt-3 min-w-[620px] rounded-xl border border-[color:var(--border)] bg-[#020913] p-4">
                      <form action={updateNeonRecordAction} className="space-y-4">
                        <input type="hidden" name="tableName" value={table.tableName} />
                        <HiddenPrimaryKeys columns={table.columns} row={row} />
                        <TableFormFields columns={table.columns} row={row} includePrimary={false} />
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
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
