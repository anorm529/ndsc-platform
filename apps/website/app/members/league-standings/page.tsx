import LeagueStandingsSection from "@/app/members/components/LeagueStandingsSection";
import MembersNav from "@/app/members/components/MembersNav";
import { requireCurrentUser } from "@/lib/auth";
import { getClubData } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

export default async function MemberLeagueStandingsPage() {
  const [user, clubData] = await Promise.all([requireCurrentUser(), getClubData()]);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
          <h1 className="text-3xl font-semibold">League Standings</h1>
          <p className="mt-2 text-slate-400">
            Current and historical league positions pulled from the shared club dataset.
          </p>
        </div>
        <LeagueStandingsSection rows={clubData.standings} />
      </section>
    </main>
  );
}
