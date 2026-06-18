import Link from "next/link";

type Match = {
  teamSlug: string;
  opponent: string;
  date: string;
  homeAway?: "Home" | "Away" | string;
  location?: string;
  result?: "W" | "L" | "D" | string | null;
  runsFor?: number | null;
  runsAgainst?: number | null;
};

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function isBlank(v: any) {
  return v === null || v === undefined || String(v).trim() === "";
}

function parseDate(d: any) {
  const t = Date.parse(String(d));
  return Number.isFinite(t) ? t : NaN;
}

function badgeClass(result?: string | null) {
  const r = String(result || "").toUpperCase();
  if (r === "W") return "bg-teal-500/15 text-teal-400 border-teal-300/25";
  if (r === "L") return "bg-rose-500/15 text-rose-200 border-rose-300/25";
  if (r === "D") return "bg-amber-500/15 text-amber-200 border-amber-300/25";
  return "bg-[#1D2E48] text-slate-400 border-[#2B4162]";
}

function fmtScore(m: Match) {
  const rf = m.runsFor;
  const ra = m.runsAgainst;
  if (typeof rf === "number" && typeof ra === "number") return `${rf}-${ra}`;
  return "—";
}

export default function TeamForm({
  matches,
  teamSlug,
  max = 5,
}: {
  matches: Match[];
  teamSlug: string;
  max?: number;
}) {
  const completed = (matches ?? [])
    .filter((m) => !isBlank(m.result) && Number.isFinite(parseDate(m.date)))
    .sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const lastN = completed.slice(0, max);

  const summary = lastN.reduce(
    (acc, m) => {
      const r = String(m.result || "").toUpperCase();
      if (r === "W") acc.w += 1;
      else if (r === "L") acc.l += 1;
      else if (r === "D") acc.d += 1;

      acc.rf += Number(m.runsFor) || 0;
      acc.ra += Number(m.runsAgainst) || 0;
      return acc;
    },
    { w: 0, l: 0, d: 0, rf: 0, ra: 0 }
  );

  return (
    <div className="rounded-2xl border border-[#2B4162] bg-slate-700/40 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white font-semibold">Team form</div>
          <div className="mt-1 text-sm text-slate-400">Last {max} completed matches</div>
        </div>

        <div className="text-sm text-slate-300">
          <span className="text-teal-400 font-semibold">{summary.w}W</span>{" "}
          <span className="text-slate-600">•</span>{" "}
          <span className="text-amber-200 font-semibold">{summary.d}D</span>{" "}
          <span className="text-slate-600">•</span>{" "}
          <span className="text-rose-200 font-semibold">{summary.l}L</span>
        </div>
      </div>

      {/* W/D/L pills row */}
      <div className="mt-4 flex flex-wrap gap-2">
        {lastN.length ? (
          lastN.map((m, idx) => (
            <span
              key={`${m.date}-${m.opponent}-${idx}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                badgeClass(m.result)
              )}
              title={`${m.result} vs ${m.opponent} (${new Date(m.date).toLocaleDateString(
                "en-GB"
              )})`}
            >
              <span className="text-base leading-none">
                {String(m.result).toUpperCase()}
              </span>
              <span className="text-slate-300 font-medium">{fmtScore(m)}</span>
            </span>
          ))
        ) : (
          <div className="text-sm text-slate-400">No completed matches yet.</div>
        )}
      </div>

      {/* Small list */}
      {lastN.length ? (
        <div className="mt-5 space-y-2">
          {lastN.map((m, idx) => (
            <div
              key={`row-${m.date}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#2B4162] bg-slate-700/30 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {m.homeAway ? `${m.homeAway} • ` : ""}vs {m.opponent}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(m.date).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {m.location ? ` • ${m.location}` : ""}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={cn(
                    "inline-flex w-9 justify-center rounded-lg border px-2 py-1 text-sm font-semibold",
                    badgeClass(m.result)
                  )}
                >
                  {String(m.result).toUpperCase()}
                </span>
                <div className="text-sm text-slate-200 font-semibold">{fmtScore(m)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Optional: quick net runs */}
      {lastN.length ? (
        <div className="mt-4 text-xs text-slate-400">
          Runs for: <span className="text-slate-200 font-semibold">{summary.rf}</span>{" "}
          • Runs against:{" "}
          <span className="text-slate-200 font-semibold">{summary.ra}</span>{" "}
          • Diff:{" "}
          <span
            className={cn(
              "font-semibold",
              summary.rf - summary.ra >= 0 ? "text-teal-400" : "text-rose-200"
            )}
          >
            {summary.rf - summary.ra >= 0 ? "+" : ""}
            {summary.rf - summary.ra}
          </span>
        </div>
      ) : null}

      <div className="mt-4">
        <Link
          href={`/members/teams/${teamSlug}#matches`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          View match history <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
