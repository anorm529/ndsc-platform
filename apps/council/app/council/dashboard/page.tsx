import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  Clock,
  Lock,
  Megaphone,
  PoundSterling,
  Trophy,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { requireCouncilUser, hasTreasurerAccess, hasRosterManagementAccess } from "@/lib/council-session";
import {
  getDashboardStats,
  getMyOpenActions,
  getUpcomingMeetings,
  getActiveFeeSummary,
  getAccountBalances,
  getMembershipStats,
  countPendingAccounts,
  countDataFlags,
  getAnnouncements,
  type MembershipStats,
  type DataFlagCounts,
  type AnnouncementRow,
  type FeeSummary,
} from "@/lib/council-queries";
import { getAllSeasons, type SeasonRow } from "@/lib/season-queries";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, tone = "neutral", href,
}: {
  label: string; value: string | number; icon: React.ElementType;
  tone?: "neutral" | "success" | "warning" | "danger"; href?: string;
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
  if (href) return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

// ─── Alert banners ────────────────────────────────────────────────────────────

function AlertBanners({
  pendingAccounts, dataFlags, isElevated,
}: {
  pendingAccounts: number; dataFlags: DataFlagCounts; isElevated: boolean;
}) {
  const alerts: { icon: React.ElementType; text: string; href: string; tone: "warning" | "danger" }[] = [];

  if (isElevated && pendingAccounts > 0) {
    alerts.push({
      icon: UserCheck,
      text: `${pendingAccounts} account${pendingAccounts > 1 ? "s" : ""} awaiting approval`,
      href: "/council/accounts",
      tone: "warning",
    });
  }
  if (dataFlags.total > 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `${dataFlags.total} data integrity issue${dataFlags.total > 1 ? "s" : ""} found`,
      href: "/council/flags",
      tone: "danger",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(({ icon: Icon, text, href, tone }) => (
        <Link
          key={href}
          href={href}
          className={[
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-[0.82rem] font-medium transition-opacity hover:opacity-90",
            tone === "warning"
              ? "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.07)] text-[color:var(--warning)]"
              : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.07)] text-[color:var(--danger)]",
          ].join(" ")}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {text}
          <span className="ml-auto text-[0.75rem] opacity-70">View →</span>
        </Link>
      ))}
    </div>
  );
}

// ─── Active season widget ─────────────────────────────────────────────────────

function SeasonWidget({ season }: { season: SeasonRow | null }) {
  if (!season || season.status === "archived") return null;

  const enrolled  = season.enrolledCount ?? 0;
  const assigned  = season.assignedCount ?? 0;
  const unassigned = enrolled - assigned;
  const assignedPct = enrolled > 0 ? Math.round((assigned / enrolled) * 100) : 0;

  const statusColours: Record<string, { bg: string; text: string }> = {
    draft:  { bg: "bg-slate-100",                   text: "text-slate-500" },
    active: { bg: "bg-[rgba(16,185,129,0.1)]",      text: "text-[color:var(--success)]" },
    closed: { bg: "bg-[rgba(233,185,62,0.1)]",      text: "text-[color:var(--warning)]" },
  };
  const sc = statusColours[season.status] ?? statusColours.draft;

  return (
    <Link href={`/council/seasons/${season.id}`} className="block hover:opacity-95 transition-opacity">
      <section className="council-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
              <Trophy className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <p className="text-[0.95rem] font-semibold text-slate-800">{season.year} Season</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${sc.bg} ${sc.text}`}>
                  {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                </span>
                {season.status === "active" && season.transfersLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(239,68,68,0.08)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--danger)]">
                    <Lock className="h-2.5 w-2.5" />
                    Transfers locked
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-5 text-center">
            <div>
              <p className="text-[1.3rem] font-bold text-slate-800">{enrolled}</p>
              <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">enrolled</p>
            </div>
            <div>
              <p className="text-[1.3rem] font-bold text-[color:var(--accent)]">{assigned}</p>
              <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">assigned</p>
            </div>
            {unassigned > 0 && (
              <div>
                <p className="text-[1.3rem] font-bold text-[color:var(--warning)]">{unassigned}</p>
                <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">unassigned</p>
              </div>
            )}
          </div>
        </div>

        {enrolled > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[0.68rem] text-[color:var(--muted-foreground)]">
              <span>Roster assignment</span>
              <span>{assignedPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.15)]">
              <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${assignedPct}%` }} />
            </div>
          </div>
        )}
      </section>
    </Link>
  );
}

// ─── Fee collection bar (all council) ────────────────────────────────────────

function FeeCollectionPanel({
  feeSummary, isTreasurer,
}: {
  feeSummary: FeeSummary | null; isTreasurer: boolean;
}) {
  if (!feeSummary) return null;

  const pct = feeSummary.totalDue > 0
    ? Math.min(100, Math.round((feeSummary.totalPaid / feeSummary.totalDue) * 100))
    : 0;
  const allPaid = feeSummary.paidCount === feeSummary.totalPlayers;

  return (
    <section className="council-panel rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[0.92rem] font-semibold text-slate-800 flex items-center gap-2">
          <PoundSterling className="h-4 w-4 text-[color:var(--accent)]" />
          {feeSummary.label} fees
        </h2>
        {isTreasurer && (
          <Link href={`/council/treasurer/fees/${feeSummary.seasonId}`} className="text-[0.75rem] text-[color:var(--accent)] hover:underline">
            Manage →
          </Link>
        )}
      </div>

      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[1.5rem] font-bold text-slate-800">{fmtGBP(feeSummary.totalPaid)}</p>
          <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
            of {fmtGBP(feeSummary.totalDue)} · {feeSummary.paidCount}/{feeSummary.totalPlayers} players fully paid
          </p>
        </div>
        <span className={[
          "shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
          allPaid
            ? "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)]"
            : "bg-[rgba(233,185,62,0.1)] text-[color:var(--warning)]",
        ].join(" ")}>
          {pct}% collected
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.15)]">
        <div
          className={`h-full rounded-full transition-all ${allPaid ? "bg-[color:var(--success)]" : "bg-[color:var(--accent)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}

// ─── Recent announcements ─────────────────────────────────────────────────────

const RECIPIENT_LABELS: Record<string, string> = {
  all_enrolled: "All players",
  all_captains: "All captains",
  all_council:  "All council",
  team:         "Team",
};

function RecentAnnouncements({ announcements }: { announcements: AnnouncementRow[] }) {
  const recent = announcements.slice(0, 3);

  return (
    <section className="council-panel rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[0.92rem] font-semibold text-slate-800 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[color:var(--accent)]" />
          Recent announcements
        </h2>
        <Link href="/council/announcements" className="text-[0.75rem] text-[color:var(--accent)] hover:underline">
          View all →
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-[0.82rem] text-[color:var(--muted-foreground)]">No announcements sent yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {recent.map((a) => (
            <li key={a.id} className="rounded-xl border border-[color:var(--border)] bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[0.85rem] font-medium text-slate-800">{a.subject}</p>
                <span className="shrink-0 rounded-full bg-[rgba(20,184,166,0.08)] px-2 py-0.5 text-[0.62rem] font-medium text-[color:var(--accent)]">
                  {a.teamName ?? RECIPIENT_LABELS[a.recipients] ?? a.recipients}
                </span>
              </div>
              <p className="mt-0.5 text-[0.7rem] text-[color:var(--muted-foreground)]">
                {a.sentCount} sent · {new Date(a.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Membership analytics ─────────────────────────────────────────────────────

function MembershipSection({ membership }: { membership: MembershipStats }) {
  const { total, male, female, withLogin, byTeam } = membership;
  const maxTeamCount = Math.max(...byTeam.map((t) => t.total), 1);
  const loginPct  = total > 0 ? Math.round((withLogin / total) * 100) : 0;
  const malePct   = total > 0 ? Math.round((male   / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;

  return (
    <section className="council-panel rounded-2xl border p-6">
      <h2 className="mb-5 text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
        <Users className="h-4 w-4 text-[color:var(--accent)]" />
        Membership
      </h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[0.75rem] text-[color:var(--muted-foreground)]">
              <span>Gender split</span>
              <span className="flex gap-3">
                <span className="text-[#E84AA5]">{female}F · {femalePct}%</span>
                <span className="text-[#1ED0D8]">{male}M · {malePct}%</span>
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.12)]">
              <div className="h-full bg-[#E84AA5]" style={{ width: `${femalePct}%` }} />
              <div className="h-full bg-[#1ED0D8]" style={{ width: `${malePct}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[0.75rem] text-[color:var(--muted-foreground)]">
              <span>Login accounts</span>
              <span>{withLogin} of {total} · {loginPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.12)]">
              <div className="h-full rounded-full bg-[color:var(--success)]" style={{ width: `${loginPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { label: "Female",   value: female,         color: "text-[#E84AA5]" },
              { label: "Male",     value: male,           color: "text-[#1ED0D8]" },
              { label: "No login", value: total - withLogin, color: "text-[color:var(--muted-foreground)]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className={`text-[1.3rem] font-bold ${color}`}>{value}</p>
                <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

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
                  <div className="h-full bg-[#E84AA5]" style={{ width: `${(team.female / maxTeamCount) * 100}%` }} />
                  <div className="h-full bg-[#1ED0D8]" style={{ width: `${(team.male / maxTeamCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireCouncilUser();
  const isElevated = hasRosterManagementAccess(user);
  const isTreasurer = hasTreasurerAccess(user);

  const [
    stats, myActions, upcoming,
    feeSummary, accountBalances, membership,
    pendingAccounts, dataFlags, announcements, allSeasons,
  ] = await Promise.all([
    getDashboardStats(),
    getMyOpenActions(user.id),
    getUpcomingMeetings(3),
    getActiveFeeSummary(),
    isTreasurer
      ? getAccountBalances()
      : Promise.resolve([] as Awaited<ReturnType<typeof getAccountBalances>>),
    getMembershipStats(),
    isElevated ? countPendingAccounts() : Promise.resolve(0),
    countDataFlags(),
    getAnnouncements(),
    getAllSeasons(),
  ]);

  const activeSeason = allSeasons.find((s) => s.status === "active")
    ?? allSeasons.find((s) => s.status === "closed")
    ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Active members"   value={membership.total}       icon={Users}        href="/council/members" />
        <StatCard label="Open actions"     value={stats.openActions}      icon={CheckSquare}  tone={stats.openActions > 0 ? "warning" : "neutral"} href="/council/actions" />
        <StatCard label="Upcoming meetings" value={stats.upcomingMeetings} icon={CalendarDays} href="/council/meetings" />
        <StatCard label="Overdue actions"  value={stats.overdueActions}   icon={AlertCircle}  tone={stats.overdueActions > 0 ? "danger" : "neutral"} href="/council/actions" />
      </div>

      {/* Alert banners */}
      <AlertBanners pendingAccounts={pendingAccounts} dataFlags={dataFlags} isElevated={isElevated} />

      {/* Active season */}
      <SeasonWidget season={activeSeason} />

      {/* Actions + Meetings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold text-slate-800">
              <CheckSquare className="h-4 w-4 text-[color:var(--accent)]" />
              My open actions
            </h2>
            <Link href="/council/actions/new" className="text-[0.78rem] text-[color:var(--accent)] hover:underline">+ New</Link>
          </div>
          {myActions.length === 0 ? (
            <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">No open actions assigned to you.</p>
          ) : (
            <ul className="space-y-3">
              {myActions.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-slate-50 p-3">
                  <span className={["mt-0.5 h-2 w-2 shrink-0 rounded-full",
                    a.priority === "high"   ? "bg-[color:var(--danger)]"  :
                    a.priority === "medium" ? "bg-[color:var(--warning)]" :
                    "bg-[color:var(--muted-foreground)]"].join(" ")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-slate-800">{a.title}</p>
                    {a.meetingTitle && <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">From: {a.meetingTitle}</p>}
                    {a.dueDate && (
                      <p className={["flex items-center gap-1 text-[0.72rem] mt-0.5",
                        new Date(a.dueDate) < new Date() ? "text-[color:var(--danger)]" : "text-[color:var(--muted-foreground)]"].join(" ")}>
                        <Clock className="h-3 w-3" />
                        Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <span className={["shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                    a.status === "in_progress"
                      ? "bg-[rgba(20,184,166,0.12)] text-[color:var(--accent)]"
                      : "bg-[rgba(115,145,176,0.1)] text-[color:var(--muted-foreground)]"].join(" ")}>
                    {a.status === "in_progress" ? "In progress" : "Open"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/council/actions" className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
            View all actions →
          </Link>
        </section>

        <section className="council-panel rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold text-slate-800">
              <CalendarDays className="h-4 w-4 text-[color:var(--accent)]" />
              Upcoming meetings
            </h2>
            <Link href="/council/meetings/new" className="text-[0.78rem] text-[color:var(--accent)] hover:underline">+ New</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">No upcoming meetings scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Link href={`/council/meetings/${m.id}`}
                    className="flex items-start gap-4 rounded-xl border border-[color:var(--border)] bg-slate-50 p-3 hover:border-[color:var(--border-strong)] hover:bg-[rgba(20,184,166,0.04)]">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[color:var(--accent-muted)] text-[color:var(--accent)]">
                      <span className="text-[0.6rem] font-bold uppercase">{m.scheduledAt.toLocaleDateString("en-GB", { month: "short" })}</span>
                      <span className="text-[1rem] font-bold leading-none">{m.scheduledAt.getDate()}</span>
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
          <Link href="/council/meetings" className="mt-4 block text-center text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
            View all meetings →
          </Link>
        </section>
      </div>

      {/* Fee collection + Recent announcements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FeeCollectionPanel feeSummary={feeSummary} isTreasurer={isTreasurer} />
        <RecentAnnouncements announcements={announcements} />
      </div>

      {/* Membership analytics */}
      <MembershipSection membership={membership} />

      {/* Treasurer — bank accounts (treasurer only) */}
      {isTreasurer && accountBalances.length > 0 && (
        <section className="council-panel rounded-2xl border p-6">
          <h2 className="mb-4 flex items-center gap-2 text-[0.95rem] font-semibold text-slate-800">
            <Wallet className="h-4 w-4 text-[color:var(--accent)]" />
            Club accounts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accountBalances.map((acc) => (
              <Link key={acc.id} href={`/council/treasurer/accounts/${acc.id}`}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-slate-50 px-4 py-3 hover:border-[color:var(--border-strong)]">
                <span className="text-[0.88rem] text-slate-800">{acc.name}</span>
                <span className={["text-[0.95rem] font-semibold",
                  acc.balance >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"].join(" ")}>
                  {fmtGBP(acc.balance)}
                </span>
              </Link>
            ))}
          </div>
          {feeSummary && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] px-4 py-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-[color:var(--warning)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-medium text-slate-800">
                  {feeSummary.label} — {fmtGBP(feeSummary.totalPaid)} collected of {fmtGBP(feeSummary.totalDue)}
                </p>
                <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                  {feeSummary.paidCount} of {feeSummary.totalPlayers} players fully paid
                </p>
              </div>
              <Link href={`/council/treasurer/fees/${feeSummary.seasonId}`}
                className="shrink-0 text-[0.75rem] text-[color:var(--accent)] hover:underline">
                View →
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
