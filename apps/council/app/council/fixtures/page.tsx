import { CalendarDays, Home, Navigation, Trophy } from "lucide-react";
import Link from "next/link";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAllSeasons } from "@/lib/season-queries";
import { getAllTeams } from "@/lib/season-queries";
import { getFixturesForSeason, deriveResult, type FixtureRow } from "@/lib/fixtures-queries";
import { AddFixtureForm } from "./add-fixture-form";
import { ResultForm } from "./result-form";

function formatDateTime(dt: string | null, fallback: string): string {
  const src = dt ?? fallback;
  try {
    return new Date(src).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return src; }
}

function ResultBadge({ result }: { result: "W" | "L" | "D" | null }) {
  if (!result) return null;
  const cfg = {
    W: "bg-[rgba(16,185,129,0.12)] text-[color:var(--success)]",
    L: "bg-[rgba(239,68,68,0.1)] text-[color:var(--danger)]",
    D: "bg-[rgba(233,185,62,0.12)] text-[color:var(--warning)]",
  }[result];
  return <span className={`rounded px-1.5 py-0.5 text-[0.68rem] font-bold ${cfg}`}>{result}</span>;
}

function FixtureRow({ fixture, canManage }: { fixture: FixtureRow; canManage: boolean }) {
  const result = deriveResult(fixture.runsFor, fixture.runsAgainst, fixture.result, fixture.status);
  const isCompleted = fixture.status === "completed" || result !== null;

  return (
    <tr className={`hover:bg-slate-50/50 ${isCompleted ? "" : "font-medium"}`}>
      <td className="py-2.5 pr-4 text-[0.78rem] text-slate-700">
        {formatDateTime(fixture.scheduledAt, fixture.gameDate)}
      </td>
      <td className="py-2.5 pr-4">
        <span className="text-[0.78rem] font-medium text-slate-800">{fixture.teamName}</span>
      </td>
      <td className="py-2.5 pr-4 text-[0.78rem] text-slate-700">{fixture.opponent}</td>
      <td className="py-2.5 pr-4">
        <span className="flex items-center gap-1 text-[0.72rem] text-[color:var(--muted-foreground)]">
          {fixture.homeAway?.toLowerCase() === "home"
            ? <Home className="h-3 w-3" />
            : <Navigation className="h-3 w-3" />}
          {fixture.homeAway}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-[0.72rem] text-[color:var(--muted-foreground)]">
        {fixture.location ?? "—"}
      </td>
      <td className="py-2.5 pr-4">
        {isCompleted ? (
          <span className="flex items-center gap-1.5">
            <ResultBadge result={result} />
            {fixture.runsFor !== null && fixture.runsAgainst !== null && (
              <span className="text-[0.75rem] text-slate-700 font-medium">
                {fixture.runsFor}–{fixture.runsAgainst}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[0.72rem] italic text-[color:var(--muted-foreground)]">Upcoming</span>
        )}
      </td>
      {canManage && (
        <td className="py-2.5">
          <ResultForm
            gameId={fixture.id}
            runsFor={fixture.runsFor}
            runsAgainst={fixture.runsAgainst}
          />
        </td>
      )}
    </tr>
  );
}

export default async function FixturesPage() {
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);

  const [allSeasons, teams] = await Promise.all([getAllSeasons(), getAllTeams()]);
  const activeSeason = allSeasons.find((s) => s.status === "active") ?? allSeasons[0] ?? null;

  const fixtures = activeSeason ? await getFixturesForSeason(activeSeason.id) : [];

  const now = new Date();
  const upcoming = fixtures.filter((f) => {
    const d = new Date(f.scheduledAt ?? f.gameDate);
    return d >= now && f.status !== "completed";
  });
  const played = fixtures.filter((f) => {
    const d = new Date(f.scheduledAt ?? f.gameDate);
    return d < now || f.status === "completed";
  });

  return (
    <div className="max-w-5xl space-y-6">
      {/* Season selector header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[color:var(--accent)]" />
          {activeSeason ? (
            <p className="text-[0.88rem] text-[color:var(--muted-foreground)]">
              <span className="font-semibold text-slate-800">{activeSeason.year} Season</span>
              {" · "}{fixtures.length} fixtures
            </p>
          ) : (
            <p className="text-[0.88rem] text-[color:var(--muted-foreground)]">No active season</p>
          )}
        </div>
        {canManage && activeSeason && (
          <div className="ml-auto">
            <AddFixtureForm seasonId={activeSeason.id} teams={teams} />
          </div>
        )}
      </div>

      {/* Upcoming fixtures */}
      {upcoming.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[color:var(--accent)]" />
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Upcoming</h3>
            <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.08)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
              {upcoming.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[0.66rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Team</th>
                  <th className="pb-2 pr-4">Opponent</th>
                  <th className="pb-2 pr-4">H/A</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2 pr-4">Result</th>
                  {canManage && <th className="pb-2">Score</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {upcoming.map((f) => <FixtureRow key={f.id} fixture={f} canManage={canManage} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Results */}
      {played.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-slate-400" />
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Results</h3>
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] text-slate-500">
              {played.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[0.66rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Team</th>
                  <th className="pb-2 pr-4">Opponent</th>
                  <th className="pb-2 pr-4">H/A</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2 pr-4">Result</th>
                  {canManage && <th className="pb-2">Update score</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {[...played].reverse().map((f) => <FixtureRow key={f.id} fixture={f} canManage={canManage} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {fixtures.length === 0 && activeSeason && (
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No fixtures yet for the {activeSeason.year} season.</p>
          {canManage && <p className="mt-1 text-[0.78rem]">Use "Add fixture" to schedule games.</p>}
        </div>
      )}

      {!activeSeason && (
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No active season found.</p>
          {canManage && (
            <Link href="/council/seasons/new" className="mt-3 inline-block text-[0.82rem] text-[color:var(--accent)] hover:underline">
              Create a season →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
