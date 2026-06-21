import { Medal } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAwardYears, getAwardsForYear } from "@/lib/awards-queries";
import { getAllSeasons, getAllTeams } from "@/lib/season-queries";
import { AddAwardForm } from "./award-form";
import { AwardsList } from "./awards-list";

export default async function AwardsPage() {
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);

  const [awardYears, seasons, teams] = await Promise.all([
    getAwardYears(),
    getAllSeasons(),
    getAllTeams(),
  ]);

  // Fetch awards for each year
  const byYear = new Map<number, Awaited<ReturnType<typeof getAwardsForYear>>>();
  await Promise.all(
    awardYears.map(async (year) => {
      byYear.set(year, await getAwardsForYear(year));
    })
  );

  const sortedSeasons = [...seasons].sort((a, b) => b.year - a.year);

  return (
    <div className="max-w-4xl space-y-6">
      {canManage && (
        <div className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Medal className="h-4 w-4 text-[color:var(--accent)]" />
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Add award</h3>
          </div>
          <AddAwardForm seasons={sortedSeasons} teams={teams} />
        </div>
      )}

      {awardYears.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[color:var(--muted-foreground)]">
          <Medal className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No awards recorded yet. Add the first one above.</p>
        </div>
      ) : (
        awardYears.map((year) => (
          <section key={year} className="council-panel rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-[color:var(--accent)]" />
              <h3 className="text-[0.92rem] font-semibold text-slate-800">{year} Awards</h3>
              <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
                {byYear.get(year)?.length ?? 0} {(byYear.get(year)?.length ?? 0) === 1 ? "award" : "awards"}
              </span>
            </div>
            <AwardsList rows={byYear.get(year) ?? []} canManage={canManage} />
          </section>
        ))
      )}
    </div>
  );
}
