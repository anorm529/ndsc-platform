import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import SiteFooter from "@/app/components/SiteFooter";
import { primaryNavLinks } from "@/lib/site-nav";
import { buildMetadata, buildPageTitle } from "@/lib/seo";
import { dbQuery } from "@/lib/db";

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Club Documents"),
  description:
    "Official documents for North Down Softball Club, including the club constitution and bylaws.",
  path: "/documents",
});

type DocumentRow = {
  type: string;
  label: string;
  filename: string;
  file_size_bytes: number | null;
  uploaded_at: Date;
};

const DOCUMENT_TYPES = [
  { type: "constitution", label: "Club Constitution" },
  { type: "bylaws", label: "Club Bylaws" },
] as const;

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getDocuments(): Promise<DocumentRow[]> {
  try {
    const result = await dbQuery<DocumentRow>(
      `SELECT type, label, filename, file_size_bytes, uploaded_at
       FROM club_documents
       ORDER BY type`,
    );
    return result.rows;
  } catch {
    return [];
  }
}

export default async function DocumentsPage() {
  const documents = await getDocuments();
  const docMap = new Map(documents.map((d) => [d.type, d]));

  const navLinks = primaryNavLinks.map((link) =>
    link.href.startsWith("/#") ? { ...link, href: link.href.slice(1) } : link,
  );

  return (
    <main className="min-h-screen bg-[#0B1324]">
      <Navbar />

      <div className="bg-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <div className="mb-2 text-xs font-semibold tracking-[0.25em] text-teal-600">
            GOVERNANCE
          </div>
          <h1 className="text-4xl font-semibold text-[#0B1324] md:text-5xl">
            Club Documents
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Official documents governing North Down Softball Club.
          </p>

          <div className="mt-10 space-y-4">
            {DOCUMENT_TYPES.map(({ type, label }) => {
              const doc = docMap.get(type);

              if (!doc) {
                return (
                  <div
                    key={type}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-200">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-600">{label}</div>
                      <div className="mt-0.5 text-sm text-slate-500">
                        Not yet available
                      </div>
                    </div>
                  </div>
                );
              }

              const size = formatBytes(doc.file_size_bytes);

              return (
                <a
                  key={type}
                  href={`/api/documents/${type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:border-teal-400 hover:shadow-md"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 transition group-hover:bg-teal-100">
                    <FileText className="h-5 w-5 text-teal-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#0B1324]">{doc.label}</div>
                    {size ? (
                      <div className="mt-0.5 text-sm text-slate-500">
                        PDF &middot; {size}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-sm text-slate-500">PDF</div>
                    )}
                  </div>
                  <Download className="h-5 w-5 shrink-0 text-teal-600 opacity-50 transition group-hover:opacity-100" />
                </a>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-slate-700"
            >
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter navLinks={navLinks} />
    </main>
  );
}
