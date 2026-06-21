import Link from "next/link";
import { Archive, Users } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getSeasonArchiveYears } from "@/lib/council-queries";

export default async function ArchivePage() {
  await requireCouncilUser();
  const years = await getSeasonArchiveYears();

  return (
    <div className="max-w-4xl space-y-6">
      <section className="council-panel rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.92rem] font-semibold text-slate-800">Season archives</h3>
          <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
            {years.length} {years.length === 1 ? "season" : "seasons"} archived
          </span>
        </div>

        {years.length === 0 ? (
          <div className="py-10 text-center">
            <Archive className="mx-auto mb-3 h-8 w-8 opacity-20 text-[color:var(--muted-foreground)]" />
            <p className="text-[0.88rem] text-[color:var(--muted-foreground)]">
              No seasons archived yet.
            </p>
            <p className="mt-1 text-[0.75rem] text-[color:var(--muted-foreground)]">
              Archives are created automatically when a season is moved to "Archived" status.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((year) => (
              <Link
                key={year}
                href={`/council/archive/${year}`}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4 hover:border-[color:var(--border-strong)] hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(20,184,166,0.08)]">
                  <Users className="h-5 w-5 text-[color:var(--accent)]" />
                </div>
                <div>
                  <p className="text-[0.92rem] font-semibold text-slate-800">{year} Season</p>
                  <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">View membership snapshot →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
