"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import type { NeonAdminSection, UploadPreview } from "@/lib/neon-admin";

type ImportResult = {
  importedRows: number;
  failedRows: number;
  totalRows: number;
};

export function NeonUploadManager({ sections }: { sections: NeonAdminSection[] }) {
  const [targetTable, setTargetTable] = useState(sections[0]?.uploadTable || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const selectedSection = useMemo(
    () => sections.find((section) => section.uploadTable === targetTable),
    [sections, targetTable],
  );

  async function submit(path: string) {
    setPending(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("targetTable", targetTable);

      if (file) {
        formData.set("file", file);
      }

      const validOnly = document.querySelector<HTMLInputElement>("#import-valid-only");

      if (validOnly?.checked) {
        formData.set("importValidOnly", "on");
      }

      const response = await fetch(path, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Upload request failed.");
        return;
      }

      if (path.endsWith("/preview")) {
        setPreview(payload);
      } else {
        setResult(payload);
        setPreview(null);
      }
    } catch {
      setError("Upload request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-panel rounded-[1.5rem] p-5">
      <div className="flex items-center gap-3">
        <FileUp className="h-5 w-5 text-[color:var(--accent)]" />
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">CSV Uploads</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Preview rows, validate required columns, then import into Neon.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#d8dfeb]">Target</span>
          <select
            value={targetTable}
            onChange={(event) => {
              setTargetTable(event.target.value);
              setPreview(null);
              setResult(null);
            }}
            className="h-11 w-full rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
          >
            {sections.map((section) => (
              <option key={section.slug} value={section.uploadTable}>
                {section.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#d8dfeb]">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setPreview(null);
              setResult(null);
            }}
            className="block w-full rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 py-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#02111d]"
          />
        </label>
      </div>

      {selectedSection?.uploadRequired?.length ? (
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
          Required columns: {selectedSection.uploadRequired.join(", ")}
        </p>
      ) : null}

      <label className="mt-4 flex items-center gap-2 text-sm text-[#cbd5e1]">
        <input id="import-valid-only" type="checkbox" className="h-4 w-4" />
        Import valid rows only when some rows fail validation.
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !file}
          onClick={() => submit("/members/admin/uploads/preview")}
          className="h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={pending || !file || !preview}
          onClick={() => submit("/members/admin/uploads/import")}
          className="h-10 rounded-full border border-[color:var(--border-strong)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Import
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-[rgba(239,75,95,0.25)] bg-[rgba(125,22,38,0.18)] p-4 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[#061321]/80 p-4">
          <p className="font-semibold text-white">
            {preview.validRows} valid, {preview.invalidRows} invalid, {preview.totalRows} total rows
          </p>
          {preview.errors.length > 0 ? (
            <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm text-[#f5c26b]">
              {preview.errors.map((item, index) => (
                <li key={`${item.rowNumber}-${index}`}>
                  Row {item.rowNumber}: {item.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[color:var(--success)]">No row errors found.</p>
          )}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-xl border border-[rgba(24,213,141,0.24)] bg-[rgba(22,135,91,0.18)] p-4 text-sm text-[color:var(--success)]">
          Imported {result.importedRows} of {result.totalRows} rows. Failed rows: {result.failedRows}.
        </div>
      ) : null}
    </section>
  );
}
