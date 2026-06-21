import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  Clock,
  PoundSterling,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import {
  getDashboardStats,
  getMyOpenActions,
  getUpcomingMeetings,
  getActiveFeeSummary,
  getAccountBalances,
  getMembershipStats,
  type MembershipStats,
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
    neutral: "border-[color:var(--border)] bg-[color:var(--panel)]",
    success: "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.07)]",
    warning: "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)]",
    danger:  "border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.07)]",
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
          <p className="mt-1 text-[2rem] font-bold tracking-[-0.04em] text-slate-900">{value}</p>
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

function MembershipSection({ membership }: { membership: MembershipStats }) {
  const { total, male, female, withLogin, byTeam } = membership;
  const maxTeamCount = Math.max(...byTeam.map((t) => t.total), 1);
  const loginPct = total > 0 ? Math.round((withLogin / total) * 100) : 0;
  const malePct  = total > 0 ? Math.round((male  / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;

  return (
    <section className="council-panel rounded-2xl border p-6">
      <h2 className="mb-5 text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
        <Users className="h-4 w-4 text-[color:var(--accent)]" />
        Membership
      </h2>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Left: gender + login summary */}
        <div className="space-y-4">
          {/* Gender split */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[0.75rem] text-[color:var(--muted-foreground)]">
              <span>Gender split</span>
              <span className="flex gap-3">
                <span className="text-[#E84AA5]">{female}F · {femalePct}%</span>
                <span className="text-[#1ED0D8]">{male}M · {malePct}%</span>
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.12)]">
              <div className="h-full bg-[#E84AA5] transition-all" style={{ width: `${femalePct}%` }} />
              <div className="h-full bg-[#1ED0D8] transition-all" style={{ width: `${malePct}%` }} />
            </div>
          </div>

          {/* Login adoption */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[0.75rem] text-[color:var(--muted-foreground)]">
              <span>Login accounts</span>
              <span>{withLogin} of {total} · {loginPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.12)]">
              <div
                className="h-full rounded-full bg-[color:var(--success)] transition-all"
                style={{ width: `${loginPct}%` }}
              />
            </div>
          </div>

          {/* Mini stat row */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { label: "Female", value: female, color: "text-[#E84AA5]" },
              { label: "Male",   value: male,   color: "text-[#1ED0D8]" },
              { label: "No login", value: total - withLogin, color: "text-[color:var(--muted-foreground)]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className={`text-[1.3rem] font-bold ${color}`}>{value}</p>
                <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: team breakdown */}
        <div>
          <p className="mb-3 text-[0.75rem] text-[color:var(--muted-foreground)]">Team breakdown</p>
          <div className="space-y-2.5">
            {byTeam.map((team) => (
              <div key={team.name}>
                <div className="mb-1 flex items-center justify-between text-[0.75rem]">
                  <span className="font-medium text-slate-700">{team.name}</span>
                  <span className="text-[color:var(--muted-foreground)]">
                    {team.female}F · {team.male}M · <span className="font-semibold text-slate-800">{team.total}</span>
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.12)]">
                  <div
                    className="h-full bg-[#E84AA5]"
                    style={{ width: `${(team.female / maxTeamCount) * 100}%` }}
                  />
                  <div
                    className="h-full bg-[#1ED0D8]"
                    style={{ width: `${(team.male / maxTeamCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireCouncilUser();

  const [stats, myActions, upcoming, feeSummary, accountBalances, membership] = await Promise.all([
    getDashboardStats(),
    getMyOpenActions(user.id),
    getUpcomingMeetings(3),
    hasTreasurerAccess(user)
      ? getActiveFeeSummary()
      : Promise.resolve(null),
    hasTreasurerAccess(user)
      ? getAccountBalances()
      : Promise.resolve([] as Awaited<ReturnType<typeof getAccountBalances>>),
    getMembershipStats(),
  ]);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Active members"
          value={membership.total}
          icon={Users}
          href="/council/members"
        />
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My open actions */}
        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
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
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-slate-50 p-3">
                  <span
                    className={[
                      "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                      a.priority === "high" ? "bg-[color:var(--danger)]" :
                      a.priority === "medium" ? "bg-[color:var(--warning)]" :
                      "bg-[color:var(--muted-foreground)]",
                    ].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-slate-800">{a.title}</p>
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
                      ? "bg-[rgba(20,184,166,0.12)] text-[color:var(--accent)]"
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
            className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
          >
            View all actions →
          </Link>
        </section>

        {/* Upcoming meetings */}
        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
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
                    className="flex items-start gap-4 rounded-xl border border-[color:var(--border)] bg-slate-50 p-3 hover:border-[color:var(--border-strong)] hover:bg-[rgba(20,184,166,0.04)]"
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
                      <p className="truncate text-[0.88rem] font-medium text-slate-800">{m.title}</p>
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
            className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
          >
            View all meetings →
          </Link>
        </section>
      </div>

      {/* Membership analytics */}
      <MembershipSection membership={membership} />

      {/* Treasurer — accounts + fee summary */}
      {(hasTreasurerAccess(user)) && accountBalances.length > 0 ? (
        <section className="council-panel rounded-2xl border p-6">
          <h2 className="mb-4 text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[color:var(--accent)]" />
            Club accounts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accountBalances.map((acc) => (
              <Link
                key={acc.id}
                href={`/council/treasurer/accounts/${acc.id}`}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-slate-50 px-4 py-3 hover:border-[color:var(--border-strong)]"
              >
                <span className="text-[0.88rem] text-slate-800">{acc.name}</span>
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
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] px-4 py-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-[color:var(--warning)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-medium text-slate-800">
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
