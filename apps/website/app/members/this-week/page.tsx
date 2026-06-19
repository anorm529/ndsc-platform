import Link from "next/link";
import MembersNav from "@/app/members/components/MembersNav";
import { requireCurrentUser } from "@/lib/auth";
import { getClubData, type Match } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

function isBlank(v: unknown) {
  return v === null || v === undefined || String(v).trim() === "";
}

function parseDate(value: unknown) {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function MatchCard({ match, result }: { match: Match; result?: boolean }) {
  const score =
    typeof match.runsFor === "number" && typeof match.runsAgainst === "number"
      ? `${match.runsFor}-${match.runsAgainst}`
      : "—";

  return (
    <Link
      href={`/members/teams/${match.teamSlug}`}
      className="block rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5 transition hover:bg-slate-700/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-teal-400">
            {titleCase(match.teamSlug)}
          </div>
          <div className="mt-2 text-lg font-semibold">vs {match.opponent}</div>
          <div className="mt-1 text-sm text-slate-400">
            {match.date
              ? new Date(match.date).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "TBC"}
            {match.location ? ` • ${match.location}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-white">{result ? score : match.homeAway ?? "—"}</div>
          <div className="text-xs text-slate-500">{result ? String(match.result ?? "").toUpperCase() : "Fixture"}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function ThisWeekPage() {
  const [user, clubData] = await Promise.all([requireCurrentUser(), getClubData()]);
  const now = Number(new Date());
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const upcoming = clubData.fixtures
    .filter((match) => {
      const ts = parseDate(match.date);
      return ts >= now && ts <= weekEnd && isBlank(match.result);
    })
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const recent = clubData.fixtures
    .filter((match) => !isBlank(match.result))
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div>
          <h1 className="text-3xl font-semibold">This Week</h1>
          <p className="mt-2 text-slate-400">Upcoming matches and recent results across all NDSC teams.</p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold">Upcoming Matches</h2>
            <div className="mt-4 space-y-4">
              {upcoming.length ? upcoming.map((match, index) => <MatchCard key={`${match.teamSlug}-${match.date}-${index}`} match={match} />) : (
                <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-slate-400">
                  No fixtures listed for the next seven days.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Recent Results</h2>
            <div className="mt-4 space-y-4">
              {recent.length ? recent.map((match, index) => <MatchCard key={`${match.teamSlug}-${match.date}-${index}`} match={match} result />) : (
                <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-slate-400">
                  No recent results listed yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
