import { Trophy } from "lucide-react";
import MembersNav from "@/app/members/components/MembersNav";
import { buildMemberProfile } from "@/app/members/lib/memberProfile";
import { groupAwardsByYear } from "@/app/members/lib/playerAwards";
import { requireCurrentUser } from "@/lib/auth";
import { getClubData } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const user = await requireCurrentUser();
  const profile = buildMemberProfile(user, await getClubData());
  const awardsByYear = groupAwardsByYear(profile.awards);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <h1 className="text-3xl font-semibold">Award Cabinet</h1>
        <p className="mt-2 text-slate-400">All awards linked to your player record.</p>

        <div className="mt-8 space-y-6">
          {awardsByYear.length ? (
            awardsByYear.map((year) => (
              <section key={year.year} className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <h2 className="text-xl font-semibold text-teal-400">{year.year}</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {year.awards.map((award, index) => (
                    <div key={`${award.award}-${index}`} className="rounded-2xl border border-amber-200/25 bg-amber-300/10 p-5">
                      <div className="flex items-start gap-3">
                        <Trophy className="mt-1 text-amber-100" size={20} />
                        <div>
                          <div className="font-semibold text-amber-100">{award.award}</div>
                          {award.team ? <div className="mt-1 text-sm text-slate-400">{award.team}</div> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-slate-400">
              No awards are linked yet. When awards are added to the player record, they will appear here automatically.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
