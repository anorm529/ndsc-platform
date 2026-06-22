import { redirect } from "next/navigation";
import { FileText, Upload, Trash2, Download, ShieldAlert } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";
import { DocumentActions } from "./document-actions";

const ELEVATED = new Set(["chairman", "vice_chair"]);

const DOCUMENT_TYPES = [
  { type: "constitution", label: "Club Constitution" },
  { type: "bylaws", label: "Club Bylaws" },
] as const;

interface DocRow {
  type: string;
  label: string;
  filename: string;
  fileSizeBytes: number | null;
  uploadedAt: Date;
  uploadedBy: string | null;
}

async function getDocuments(): Promise<DocRow[]> {
  try {
    const res = await mainQuery<{
      type: string; label: string; filename: string;
      file_size_bytes: number | null; uploaded_at: Date; uploaded_by: string | null;
    }>(
      `SELECT type, label, filename, file_size_bytes, uploaded_at, uploaded_by
       FROM club_documents
       ORDER BY type ASC`
    );
    return res.rows.map((r) => ({
      type: r.type,
      label: r.label,
      filename: r.filename,
      fileSizeBytes: r.file_size_bytes,
      uploadedAt: r.uploaded_at,
      uploadedBy: r.uploaded_by,
    }));
  } catch {
    // Table may not exist yet
    return [];
  }
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const user = await requireCouncilUser();
  const isElevated = user.isOwner || [...user.councilPermissions].some((p) => ELEVATED.has(p));

  const docs = await getDocuments();
  const docMap = new Map(docs.map((d) => [d.type, d]));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-[1.05rem] font-semibold text-slate-800">Club documents</h2>
        <p className="mt-0.5 text-[0.8rem] text-[color:var(--muted-foreground)]">
          Official club documents published to the public website
        </p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_TYPES.map(({ type, label }) => {
          const doc = docMap.get(type) ?? null;
          return (
            <section key={type} className="council-panel rounded-2xl border p-5">
              <div className="flex items-start gap-4">
                <div className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  doc ? "bg-[rgba(20,184,166,0.08)]" : "bg-slate-100",
                ].join(" ")}>
                  <FileText className={`h-5 w-5 ${doc ? "text-[color:var(--accent)]" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[0.9rem] font-semibold text-slate-800">{label}</h3>
                    {doc ? (
                      <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--success)]">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium text-slate-500">
                        Not uploaded
                      </span>
                    )}
                  </div>

                  {doc ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[0.78rem] text-slate-700">{doc.filename}</p>
                      <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                        {formatBytes(doc.fileSizeBytes)} · uploaded{" "}
                        {doc.uploadedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {doc.uploadedBy ? ` by ${doc.uploadedBy}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[0.78rem] text-[color:var(--muted-foreground)]">
                      No file uploaded yet
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {doc && (
                      <a
                        href={`/api/documents/${type}`}
                        download={doc.filename}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[0.78rem] font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    )}
                    {isElevated && (
                      <DocumentActions type={type} label={label} hasExisting={!!doc} />
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {!isElevated && (
        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-slate-50 p-4">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[color:var(--muted-foreground)] mt-0.5" />
          <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
            Only the chairman, vice chairman, or owner can upload or replace documents.
          </p>
        </div>
      )}
    </div>
  );
}
