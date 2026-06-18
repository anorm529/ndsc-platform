"use client";

import { useMemo, useRef, useState } from "react";
import { Database, Download, FileUp, Plus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { type NocoTableSnapshot } from "@/lib/nocodb";
import { FormSubmitButton } from "@/components/admin/form-submit-button";

function buildTemplateHref(headers: string[]) {
  const csv = `${headers.join(",")}\n`;
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/[\s_-]+/g, "").toLowerCase();
}

function parseHeaderRow(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const headers: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    const next = firstLine[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      headers.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  headers.push(current.trim());
  return headers.filter(Boolean);
}

type ValidationState = {
  fileName: string;
  headers: string[];
  missingHeaders: string[];
  extraHeaders: string[];
};

type PreviewState = {
  totalRows: number;
  toAdd: number;
  toUpdate: number;
  toDelete: number;
  unchanged: number;
  missingIdentifiers: number;
  duplicateIdentifiers: number;
  warnings: string[];
};

export function TableManager({ table }: { table: NocoTableSnapshot }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const templateHref = buildTemplateHref(table.expectedHeaders);
  const formRef = useRef<HTMLFormElement>(null);
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [validationError, setValidationError] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  const [mode, setMode] = useState(table.defaultMode);
  const [confirmationText, setConfirmationText] = useState("");
  const destructiveConfirmationTarget = table.label;
  const importStatus = searchParams.get("importStatus");
  const importTableId = searchParams.get("importTableId");
  const importMatchesCurrentTable = importTableId === table.tableId;

  async function handleFileChange(file: File | null) {
    if (!file) {
      setValidation(null);
      setValidationError("");
      setPreview(null);
      setPreviewError("");
      return;
    }

    try {
      const text = await file.text();
      const headers = parseHeaderRow(text);
      const normalizedExpected = new Map(
        table.expectedHeaders.map((header) => [normalizeHeader(header), header]),
      );
      const normalizedActual = new Map(headers.map((header) => [normalizeHeader(header), header]));
      const missingHeaders = table.expectedHeaders.filter(
        (header) => !normalizedActual.has(normalizeHeader(header)),
      );
      const extraHeaders = headers.filter(
        (header) => !normalizedExpected.has(normalizeHeader(header)),
      );

      setValidation({
        fileName: file.name,
        headers,
        missingHeaders,
        extraHeaders,
      });
      setValidationError("");
      setPreview(null);
      setPreviewError("");
    } catch {
      setValidation(null);
      setValidationError("The selected file could not be read as CSV.");
      setPreview(null);
      setPreviewError("");
    }
  }

  async function handlePreview() {
    if (!formRef.current) {
      return;
    }

    setPreviewPending(true);
    setPreviewError("");
    setPreview(null);

    try {
      const formData = new FormData(formRef.current);
      const response = await fetch(`/admin/api/tables/${table.tableId}/csv/preview`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as PreviewState | { error?: string };

      if (!response.ok) {
        setPreviewError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to preview this CSV.",
        );
        return;
      }

      setPreview(payload as PreviewState);
    } catch {
      setPreviewError("Unable to preview this CSV.");
    } finally {
      setPreviewPending(false);
    }
  }

  const canPreview = useMemo(
    () =>
      Boolean(validation && validation.missingHeaders.length === 0) &&
      !previewPending,
    [previewPending, validation],
  );
  const requiresTypedConfirmation = mode === "delete" || mode === "replace";
  const canApprove =
    Boolean(preview && preview.missingIdentifiers === 0) &&
    (!requiresTypedConfirmation || confirmationText === destructiveConfirmationTarget);

  return (
    <article className="admin-panel rounded-[1.8rem] px-5 py-6 sm:px-6 sm:py-7">
      <div className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(7,63,82,0.34)] text-[color:var(--accent)]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[1.25rem] font-semibold tracking-[-0.04em] text-white">{table.label}</h3>
            <p className="text-sm text-[color:var(--muted-foreground)]">Table ID: {table.tableId || "Not configured"}</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[1.8rem] font-semibold tracking-[-0.05em] text-white">{table.totalRows}</div>
          <div className="text-sm text-[color:var(--muted-foreground)]">records available</div>
        </div>
      </div>

      {table.error ? (
        <div className="mt-5 rounded-[1.2rem] border border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {table.error}
        </div>
      ) : null}

      {importMatchesCurrentTable && importStatus ? (
        <div
          className={[
            "mt-5 rounded-[1.2rem] px-4 py-4 text-sm",
            importStatus === "success"
              ? "border border-[rgba(24,213,141,0.24)] bg-[rgba(22,135,91,0.18)] text-[color:var(--success)]"
              : "border border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] text-[color:var(--danger)]",
          ].join(" ")}
        >
          <p className="font-medium">
            {searchParams.get("importMessage") || "Import completed."}
          </p>
          <p className="mt-2">
            Rows: {searchParams.get("rows") || "0"} | Add: {searchParams.get("add") || "0"} | Update:{" "}
            {searchParams.get("update") || "0"} | Delete: {searchParams.get("delete") || "0"}
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="admin-panel-soft rounded-[1.5rem] px-5 py-5">
          <h4 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">CSV Export</h4>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Download the full table as CSV only when you need it. This avoids loading large datasets into the dashboard view.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`/admin/api/tables/${table.tableId}/csv`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
            <a
              href={templateHref}
              download={`${table.key}-template.csv`}
              className="admin-panel-soft inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white hover:border-[color:var(--border-strong)] hover:text-[color:var(--accent-strong)]"
            >
              <Download className="h-4 w-4" />
              Download Template
            </a>
          </div>
        </section>

        <section className="admin-panel-soft rounded-[1.5rem] px-5 py-5">
          <h4 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">CSV Import</h4>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Upload a CSV and choose how NocoDB should process the rows.
          </p>

          <form
            ref={formRef}
            action={`/admin/api/tables/${table.tableId}/csv`}
            method="post"
            encType="multipart/form-data"
            className="mt-5 space-y-4"
          >
            <input type="hidden" name="returnTo" value={pathname} />

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#d8dfeb]">CSV file</span>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                onChange={(event) => {
                  void handleFileChange(event.target.files?.[0] || null);
                }}
                className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(29,215,207,0.14)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--accent)]"
              />
            </label>

            {validationError ? (
              <div className="rounded-[1.1rem] border border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] px-4 py-3 text-sm text-[color:var(--danger)]">
                {validationError}
              </div>
            ) : null}

            {validation ? (
              <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                <p className="font-medium text-white">{validation.fileName}</p>
                <p className="mt-2">
                  {validation.missingHeaders.length === 0
                    ? "Header check passed."
                    : "Header check found missing expected columns."}
                </p>
                <p className="mt-2">Detected headers: {validation.headers.join(", ") || "None"}</p>
                {validation.missingHeaders.length > 0 ? (
                  <p className="mt-2 text-[color:var(--danger)]">
                    Missing: {validation.missingHeaders.join(", ")}
                  </p>
                ) : null}
                {validation.extraHeaders.length > 0 ? (
                  <p className="mt-2 text-[color:var(--warning)]">
                    Extra: {validation.extraHeaders.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#d8dfeb]">Mode</span>
                <select
                  name="mode"
                  defaultValue={table.defaultMode}
                  onChange={(event) => {
                    setMode(event.target.value as typeof table.defaultMode);
                    setPreview(null);
                    setPreviewError("");
                    setConfirmationText("");
                  }}
                  className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="merge">Merge rows</option>
                  <option value="add">Add only</option>
                  <option value="update">Update existing rows</option>
                  <option value="delete">Delete rows</option>
                  <option value="replace">Replace all rows</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#d8dfeb]">Identifier columns</span>
                <input
                  type="text"
                  name="identifierColumns"
                  defaultValue={table.defaultIdentifierColumns}
                  className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>

            <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
              {table.importNote ||
                "Merge, Update, and Delete use one or more identifier columns from your CSV. Separate multiple columns with commas."}
            </div>

            {requiresTypedConfirmation ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#d8dfeb]">
                  Type <span className="text-white">{destructiveConfirmationTarget}</span> to confirm this {mode} action
                </span>
                <input
                  type="text"
                  name="confirmText"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  className="w-full rounded-xl border border-[rgba(239,75,95,0.18)] bg-[rgba(44,12,18,0.45)] px-3 py-3 text-sm text-white outline-none"
                />
              </label>
            ) : null}

            {previewError ? (
              <div className="rounded-[1.1rem] border border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] px-4 py-3 text-sm text-[color:var(--danger)]">
                {previewError}
              </div>
            ) : null}

            {preview ? (
              <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4 text-sm text-[color:var(--muted-foreground)]">
                <p className="font-medium text-white">Import Preview</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[rgba(115,145,176,0.1)] bg-[rgba(7,18,30,0.76)] px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Rows</div>
                    <div className="mt-1 text-lg font-semibold text-white">{preview.totalRows}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(115,145,176,0.1)] bg-[rgba(7,18,30,0.76)] px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Add</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--accent)]">{preview.toAdd}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(115,145,176,0.1)] bg-[rgba(7,18,30,0.76)] px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Update</div>
                    <div className="mt-1 text-lg font-semibold text-white">{preview.toUpdate}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(115,145,176,0.1)] bg-[rgba(7,18,30,0.76)] px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Delete</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--danger)]">{preview.toDelete}</div>
                  </div>
                </div>
                {preview.warnings.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {preview.warnings.map((warning) => (
                      <p key={warning} className="text-sm text-[color:var(--warning)]">
                        {warning}
                      </p>
                    ))}
                  </div>
                ) : null}
                {preview.missingIdentifiers > 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--danger)]">
                    Approval is disabled until missing identifier values are fixed.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              {requiresTypedConfirmation ? (
                <a
                  href={`/admin/api/tables/${table.tableId}/csv?backup=1`}
                  className="admin-panel-soft inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium text-[#c5cfdb] hover:border-[color:var(--border-strong)] hover:text-white"
                >
                  Download Backup CSV
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handlePreview();
                }}
                disabled={!canPreview}
                className="admin-panel-soft inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium text-[#c5cfdb] hover:border-[color:var(--border-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewPending ? "Previewing..." : "Preview Import"}
              </button>
              <FormSubmitButton
                idleLabel="Approve And Import"
                pendingLabel="Importing..."
                disabled={!canApprove}
              />
            </div>
          </form>
        </section>
      </div>

      <section className="mt-6 admin-panel-soft rounded-[1.5rem] px-5 py-5">
        <div className="flex items-center gap-2 text-[1.02rem] font-medium tracking-[-0.03em] text-white">
          <Plus className="h-4 w-4 text-[color:var(--accent)]" />
          Expected CSV Headers
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {table.expectedHeaders.length > 0 ? (
            table.expectedHeaders.map((header) => (
              <span
                key={header}
                className="rounded-full border border-[rgba(115,145,176,0.12)] bg-[rgba(10,29,49,0.7)] px-3 py-1 text-xs font-medium text-[#dce5f1]"
              >
                {header}
              </span>
            ))
          ) : (
            <span className="text-sm text-[color:var(--muted-foreground)]">Expected headers are not configured for this table yet.</span>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
          <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
          <span>
            Large databases are now handled through manual CSV export/import rather than loading every row into the dashboard.
          </span>
        </div>
      </section>
    </article>
  );
}
