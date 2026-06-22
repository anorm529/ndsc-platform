"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, X } from "lucide-react";
import type { PreviewResult, ImportResult } from "@/lib/stats-queries";

type Stage = "idle" | "previewing" | "preview_done" | "importing" | "done" | "error";

export function StatsUploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  function reset() {
    setStage("idle");
    setFileName("");
    setCsvText("");
    setPreview(null);
    setResult(null);
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
    setResult(null);
    setStage("idle");
  }

  async function handlePreview() {
    if (!csvText) return;
    setStage("previewing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/stats/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mode: "preview" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      setPreview(data as PreviewResult);
      setStage("preview_done");
    } catch (err) {
      setErrorMsg(String(err));
      setStage("error");
    }
  }

  async function handleImport() {
    if (!csvText) return;
    setStage("importing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/stats/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mode: "import" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data as ImportResult);
      setStage("done");
      router.refresh();
    } catch (err) {
      setErrorMsg(String(err));
      setStage("error");
    }
  }

  return (
    <div className="space-y-4">
      {/* File picker */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.9rem] font-semibold text-slate-800">Upload game stats CSV</h3>
          <a
            href="/api/stats/template"
            download
            className="ml-auto text-[0.75rem] text-[color:var(--accent)] hover:underline"
          >
            Download template
          </a>
        </div>

        <label className={[
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          fileName
            ? "border-[color:var(--accent)] bg-[rgba(20,184,166,0.04)]"
            : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
        ].join(" ")}>
          {fileName ? (
            <>
              <FileText className="h-6 w-6 text-[color:var(--accent)]" />
              <span className="text-[0.82rem] font-medium text-slate-700">{fileName}</span>
              <span className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                {csvText.split("\n").length - 1} data rows
              </span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-[color:var(--muted-foreground)]" />
              <span className="text-[0.82rem] text-[color:var(--muted-foreground)]">
                Click to choose a CSV file
              </span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>

        {fileName && stage !== "done" && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={stage === "previewing" || stage === "importing"}
              className="flex-1 rounded-xl bg-slate-100 py-2 text-[0.82rem] font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {stage === "previewing" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                </span>
              ) : "Preview"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl p-2 text-[color:var(--muted-foreground)] hover:bg-red-50 hover:text-[color:var(--danger)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {stage === "preview_done" && preview && (
        <div className="council-panel rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--accent)]" />
            <h3 className="text-[0.9rem] font-semibold text-slate-800">Preview</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Rows" value={preview.totalRows} />
            <Stat label="Games matched" value={preview.matchedGames} accent={preview.matchedGames > 0} />
            <Stat label="Games not in calendar" value={preview.unmatchedGames.length} danger={preview.unmatchedGames.length > 0} />
            <Stat label="Players matched" value={preview.matchedPlayers} />
            <Stat label="Unmatched players" value={preview.unmatchedPlayers.length} danger={preview.unmatchedPlayers.length > 0} />
          </div>

          {preview.unmatchedGames.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-red-700">
                Games not found in calendar — those rows will be skipped. Add them in Fixtures first.
              </p>
              <ul className="space-y-0.5">
                {preview.unmatchedGames.map((g) => (
                  <li key={g} className="text-[0.78rem] text-red-800">· {g}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.unmatchedPlayers.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-amber-700">
                Unmatched players — rows will be skipped:
              </p>
              <ul className="space-y-0.5">
                {preview.unmatchedPlayers.map((name) => (
                  <li key={name} className="text-[0.78rem] text-amber-800">· {name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={preview.matchedGames === 0 || preview.matchedPlayers === 0}
              className="flex-1 rounded-xl bg-[color:var(--accent)] py-2.5 text-[0.85rem] font-semibold text-white hover:bg-[color:var(--accent-hover)] disabled:opacity-40"
            >
              Confirm import
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-[0.82rem] text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {stage === "importing" && (
        <div className="council-panel rounded-2xl border p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[color:var(--accent)]" />
          <p className="text-[0.88rem] text-[color:var(--muted-foreground)]">Importing stats…</p>
        </div>
      )}

      {/* Done */}
      {stage === "done" && result && (
        <div className="council-panel rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[color:var(--success)]" />
            <h3 className="text-[0.9rem] font-semibold text-slate-800">Import complete</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Inserted" value={result.inserted} accent />
            <Stat label="Updated" value={result.updated} />
            <Stat label="Skipped" value={result.skipped} danger={result.skipped > 0} />
          </div>

          {result.unmatchedGames.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-red-700">
                Games not found in calendar — add fixtures first:
              </p>
              {result.unmatchedGames.map((g) => (
                <p key={g} className="text-[0.78rem] text-red-800">· {g}</p>
              ))}
            </div>
          )}

          {result.unmatchedPlayers.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-amber-700">
                Skipped — players not found:
              </p>
              {result.unmatchedPlayers.map((n) => (
                <p key={n} className="text-[0.78rem] text-amber-800">· {n}</p>
              ))}
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-red-700">Errors:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-[0.78rem] text-red-800">· {e}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-[color:var(--border)] py-2 text-[0.82rem] text-slate-700 hover:bg-slate-50"
          >
            Upload another file
          </button>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="council-panel rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-[0.85rem] font-semibold text-red-700">Error</p>
          </div>
          <p className="text-[0.78rem] text-red-800">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setStage("idle")}
            className="mt-3 text-[0.78rem] text-red-600 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
      <p className={[
        "text-xl font-bold",
        danger ? "text-[color:var(--danger)]" : accent ? "text-[color:var(--accent)]" : "text-slate-800",
      ].join(" ")}>
        {value}
      </p>
      <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">{label}</p>
    </div>
  );
}
