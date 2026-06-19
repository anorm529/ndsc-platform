import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  Clock,
  PoundSterling,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { requireCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import {
  getDashboardStats,
  getMyOpenActions,
  getUpcomingMeetings,
  getActiveFeeSummary,
  getAccountBalances,
} from "@/lib/council-queries";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "neutral" | "success" | "warning" | "danger";
  href?: string;
}) {
  const colours = {
    neutral: "border-[color:var(--border)] bg-[rgba(6,16,29,0.6)]",
    success: "border-[rgba(24,213,141,0.2)] bg-[rgba(22,135,91,0.1)]",
    warning: "border-[rgba(233,185,62,0.22)] bg-[rgba(94,68,16,0.12)]",
    danger:  "border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.12)]",
  };
  const iconColours = {
    neutral: "text-[color:var(--accent)]",
    success: "text-[color:var(--success)]",
    warning: "text-[color:var(--warning)]",
    danger:  "text-[color:var(--danger)]",
  };

  const inner = (
    <div className={`council-panel rounded-2xl border p-5 ${colours[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-medium text-[color:var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-[2rem] font-bold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <Icon className={`h-6 w-6 shrink-0 mt-0.5 ${iconColours[tone]}`} />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  }
  return inner;
}

export default async function DashboardPage() {
  const user = await requireCouncilUser();

  const [stats, myActions, upcoming, feeSummary, accountBalances] = await Promise.all([
    getDashboardStats(),
    getMyOpenActions(user.id),
    getUpcomingMeetings(3),
    hasTreasurerAccess(user)
      ? getActiveFeeSummary()
      : Promise.resolve(null),
    hasTreasurerAccess(user)
      ? getAccountBalances()
      : Promise.resolve([] as Awaited<ReturnType<typeof getAccountBalances>>),
  ]);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Open actions"
          value={stats.openActions}
          icon={CheckSquare}
          tone={stats.openActions > 0 ? "warning" : "neutral"}
          href="/council/actions"
        />
        <StatCard
          label="Upcoming meetings"
          value={stats.upcomingMeetings}
          icon={CalendarDays}
          href="/council/meetings"
        />
        <StatCard
          label="Overdue actions"
          value={stats.overdueActions}
          icon={AlertCircle}
          tone={stats.overdueActions > 0 ? "danger" : "neutral"}
          href="/council/actions"
        />
        {feeSummary ? (
          <StatCard
            label={`${feeSummary.label} fees paid`}
            value={`${feeSummary.paidCount}/${feeSummary.totalPlayers}`}
            icon={PoundSterling}
            tone={feeSummary.paidCount === feeSummary.totalPlayers ? "success" : "warning"}
            href="/council/treasurer/fees"
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My open actions */}
        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold text-white flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-[color:var(--accent)]" />
              My open actions
            </h2>
            <Link
              href="/council/actions/new"
              className="text-[0.78rem] text-[color:var(--accent)] hover:underline"
            >
              + New
            </Link>
          </div>

          {myActions.length === 0 ? (
            <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">
              No open actions assigned to you.
            </p>
          ) : (
            <ul className="space-y-3">
              {myActions.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.5)] p-3">
                  <span
                    className={[
                      "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                      a.priority === "high" ? "bg-[color:var(--danger)]" :
                      a.priority === "medium" ? "bg-[color:var(--warning)]" :
                      "bg-[color:var(--muted-foreground)]",
                    ].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-white">{a.title}</p>
                    {a.meetingTitle ? (
                      <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">
                        From: {a.meetingTitle}
                      </p>
                    ) : null}
                    {a.dueDate ? (
                      <p className={[
                        "flex items-center gap-1 text-[0.72rem] mt-0.5",
                        new Date(a.dueDate) < new Date()
                          ? "text-[color:var(--danger)]"
                          : "text-[color:var(--muted-foreground)]",
                      ].join(" ")}>
                        <Clock className="h-3 w-3" />
                        Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    ) : null}
                  </div>
                  <span className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                    a.status === "in_progress"
                      ? "bg-[rgba(29,215,207,0.12)] text-[color:var(--accent)]"
                      : "bg-[rgba(115,145,176,0.1)] text-[color:var(--muted-foreground)]",
                  ].join(" ")}>
                    {a.status === "in_progress" ? "In progress" : "Open"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/council/actions"
            className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-white"
          >
            View all actions →
          </Link>
        </section>

        {/* Upcoming meetings */}
        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[color:var(--accent)]" />
              Upcoming meetings
            </h2>
            <Link
              href="/council/meetings/new"
              className="text-[0.78rem] text-[color:var(--accent)] hover:underline"
            >
              + New
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">
              No upcoming meetings scheduled.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/council/meetings/${m.id}`}
                    className="flex items-start gap-4 rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.5)] p-3 hover:border-[color:var(--border-strong)] hover:bg-[rgba(29,215,207,0.04)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[color:var(--accent-muted)] text-[color:var(--accent)]">
                      <span className="text-[0.6rem] font-bold uppercase">
                        {m.scheduledAt.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                      <span className="text-[1rem] font-bold leading-none">
                        {m.scheduledAt.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.88rem] font-medium text-white">{m.title}</p>
                      <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">
                        {m.scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        {m.location ? ` · ${m.location}` : ""}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.65rem] capitalize text-[color:var(--muted-foreground)]">
                        {m.type}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/council/meetings"
            className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-white"
          >
            View all meetings →
          </Link>
        </section>
      </div>

      {/* Treasurer — accounts + fee summary */}
      {(hasTreasurerAccess(user)) && accountBalances.length > 0 ? (
        <section className="council-panel rounded-2xl border p-6">
          <h2 className="mb-4 text-[0.95rem] font-semibold text-white flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[color:var(--accent)]" />
            Club accounts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accountBalances.map((acc) => (
              <Link
                key={acc.id}
                href={`/council/treasurer/accounts/${acc.id}`}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.5)] px-4 py-3 hover:border-[color:var(--border-strong)]"
              >
                <span className="text-[0.88rem] text-white">{acc.name}</span>
                <span className={[
                  "text-[0.95rem] font-semibold",
                  acc.balance >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]",
                ].join(" ")}>
                  {fmtCurrency(acc.balance)}
                </span>
              </Link>
            ))}
          </div>
          {feeSummary ? (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-[rgba(233,185,62,0.2)] bg-[rgba(94,68,16,0.1)] px-4 py-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-[color:var(--warning)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-medium text-white">
                  {feeSummary.label} — {fmtCurrency(feeSummary.totalPaid)} collected of {fmtCurrency(feeSummary.totalDue)}
                </p>
                <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                  {feeSummary.paidCount} of {feeSummary.totalPlayers} players fully paid
                </p>
              </div>
              <Link
                href={`/council/treasurer/fees/${feeSummary.seasonId}`}
                className="shrink-0 text-[0.75rem] text-[color:var(--accent)] hover:underline"
              >
                View →
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
