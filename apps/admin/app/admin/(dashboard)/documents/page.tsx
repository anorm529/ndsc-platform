import { FileText } from "lucide-react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { SectionCard } from "@/components/admin/section-card";
import { requireAdminPermission } from "@/lib/permissions";
import { dbQuery } from "@/lib/db";
import {
  deleteDocumentAction,
  ensureDocumentsTable,
  uploadDocumentAction,
} from "./actions";

type DocumentRow = {
  type: string;
  label: string;
  filename: string;
  file_size_bytes: number | null;
  uploaded_at: Date;
  uploaded_by: string | null;
};

const DOCUMENT_TYPES = [
  { type: "constitution", label: "Club Constitution" },
  { type: "bylaws", label: "Club Bylaws" },
] as const;

function formatBytes(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getDocuments(): Promise<DocumentRow[]> {
  await ensureDocumentsTable();
  const result = await dbQuery<DocumentRow>(
    `SELECT type, label, filename, file_size_bytes, uploaded_at, uploaded_by
     FROM club_documents
     ORDER BY type`,
  );
  return result.rows;
}

export default async function DocumentsPage() {
  await requireAdminPermission("documents");
  const documents = await getDocuments();
  const docMap = new Map(documents.map((d) => [d.type, d]));

  return (
    <div className="space-y-6">
      <SectionCard
        title="Club Documents"
        subtitle="Upload and manage the constitution and bylaws PDF files shown on the public website."
        icon={FileText}
      >
        <div className="mt-6 space-y-4">
          {DOCUMENT_TYPES.map(({ type, label }) => {
            const existing = docMap.get(type);

            return (
              <div
                key={type}
                className="admin-panel-soft rounded-2xl p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgba(23,129,124,0.18)]">
                      <FileText className="h-4.5 w-4.5 text-[color:var(--accent)]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{label}</div>
                      {existing ? (
                        <div className="mt-1 space-y-0.5 text-sm text-[#9ca6b6]">
                          <div>{existing.filename}</div>
                          <div>
                            {formatBytes(existing.file_size_bytes)} &middot; Uploaded{" "}
                            {formatDate(existing.uploaded_at)}
                            {existing.uploaded_by ? ` by ${existing.uploaded_by}` : ""}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-[#9ca6b6]">
                          Not uploaded yet
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {existing ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200">
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-400/15 bg-slate-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
                        Not uploaded
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-[color:var(--border)] pt-5">
                  <form action={uploadDocumentAction} encType="multipart/form-data" className="flex flex-1 flex-wrap items-end gap-3">
                    <input type="hidden" name="type" value={type} />
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-[#8b95a5]">
                        {existing ? "Replace PDF" : "Upload PDF"}
                      </label>
                      <input
                        type="file"
                        name="file"
                        accept="application/pdf,.pdf"
                        required
                        className="block w-full rounded-lg border border-[color:var(--border)] bg-[rgba(3,11,21,0.58)] px-3 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-[rgba(23,129,124,0.22)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[color:var(--accent)]"
                      />
                    </div>
                    <FormSubmitButton
                      idleLabel={existing ? "Replace" : "Upload"}
                      pendingLabel="Uploading…"
                    />
                  </form>

                  {existing ? (
                    <form action={deleteDocumentAction}>
                      <input type="hidden" name="type" value={type} />
                      <FormSubmitButton
                        idleLabel="Delete"
                        pendingLabel="Deleting…"
                        variant="danger"
                      />
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-[#8b95a5]">
          Uploaded documents are immediately available on the public{" "}
          <a
            href="https://northdownsoftballclub.co.uk/documents"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--accent)] hover:underline"
          >
            /documents
          </a>{" "}
          page of the website.
        </p>
      </SectionCard>
    </div>
  );
}
