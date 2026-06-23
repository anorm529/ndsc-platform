import { notFound } from "next/navigation";
import Link from "next/link";
import { BarChart2, ChevronLeft, Home, Navigation } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getGameById, getGameStatRecords } from "@/lib/stats-queries";
import { StatRecordsTable } from "./stat-records-table";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const user = await requireCouncilUser();
  const canEdit = hasRosterManagementAccess(user);
  const { gameId } = await params;

  const [game, records] = await Promise.all([
    getGameById(gameId),
    getGameStatRecords(gameId),
  ]);

  if (!game) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/council/stats"
          className="flex items-center gap-1 text-[0.8rem] text-[color:var(--muted-foreground)] hover:text-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Stats
        </Link>
      </div>

      <section className="council-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[color:var(--accent)]" />
            <h2 className="text-[1rem] font-semibold text-slate-800">
              {game.teamName} vs {game.opponent}
            </h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(20,184,166,0.08)] px-2.5 py-1 text-[0.7rem] text-[color:var(--accent)]">
              {game.year}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] text-slate-600">
              {game.homeAway?.toLowerCase() === "home"
                ? <Home className="h-3 w-3" />
                : <Navigation className="h-3 w-3" />}
              {game.homeAway}
            </span>
            <span className="text-[0.78rem] text-[color:var(--muted-foreground)]">{formatDate(game.gameDate)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-[rgba(20,184,166,0.08)] px-2.5 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
            {records.length} stat {records.length === 1 ? "row" : "rows"}
          </span>
        </div>
      </section>

      <section className="council-panel rounded-2xl border p-5">
        {records.length === 0 ? (
          <p className="py-4 text-center text-[0.85rem] italic text-[color:var(--muted-foreground)]">
            No stat records for this game.
          </p>
        ) : (
          <StatRecordsTable records={records} canEdit={canEdit} />
        )}
      </section>
    </div>
  );
}
