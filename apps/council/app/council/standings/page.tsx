import { Trophy } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAllStandings } from "@/lib/standings-queries";
import { AddStandingForm } from "./standing-form";
import { StandingsTable } from "./standings-table";

export default async function StandingsPage() {
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);
  const allRows = await getAllStandings();

  // Group by year
  const byYear = new Map<number, typeof allRows>();
  for (const row of allRows) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="max-w-4xl space-y-6">
      {canManage && (
        <div className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[color:var(--accent)]" />
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Add standings row</h3>
          </div>
          <AddStandingForm />
        </div>
      )}

      {years.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[color:var(--muted-foreground)]">
          <Trophy className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No standings data yet. Add rows above to get started.</p>
        </div>
      ) : (
        years.map((year) => {
          const rows = byYear.get(year)!;
          // Group by division within year
          const byDiv = new Map<string, typeof rows>();
          for (const row of rows) {
            const div = row.division ?? "";
            if (!byDiv.has(div)) byDiv.set(div, []);
            byDiv.get(div)!.push(row);
          }
          const divs = [...byDiv.keys()].sort();

          return (
            <section key={year} className="council-panel rounded-2xl border p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[color:var(--accent)]" />
                <h3 className="text-[0.92rem] font-semibold text-slate-800">{year} Standings</h3>
                <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
                  {rows.length} {rows.length === 1 ? "team" : "teams"}
                </span>
              </div>

              {divs.map((div) => (
                <div key={div}>
                  {div && (
                    <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                      Division {div}
                    </p>
                  )}
                  <StandingsTable rows={byDiv.get(div)!} canManage={canManage} />
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
