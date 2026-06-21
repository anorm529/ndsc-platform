import { AlertTriangle, CheckCircle2, Link2Off, Users, Clock, UserMinus } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getDataFlags } from "@/lib/account-queries";

export default async function FlagsPage() {
  await requireCouncilUser();
  const flags = await getDataFlags();

  const totalIssues =
    flags.unlinkedActive.length +
    flags.multiUserPlayers.length +
    flags.stalePending.length +
    flags.playersWithoutAccounts.length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-slate-800">Data integrity flags</h2>
          <p className="mt-0.5 text-[0.8rem] text-[color:var(--muted-foreground)]">
            Potential issues in member data that may need attention
          </p>
        </div>
        {totalIssues === 0 ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.1)] px-3 py-1 text-[0.75rem] font-medium text-[color:var(--success)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All clear
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.1)] px-3 py-1 text-[0.75rem] font-medium text-[color:var(--danger)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* 1 — Stale pending accounts */}
      <FlagSection
        icon={<Clock className="h-4 w-4" />}
        title="Stale pending accounts"
        description="Accounts pending approval for more than 14 days"
        count={flags.stalePending.length}
      >
        {flags.stalePending.length > 0 ? (
          <table className="w-full text-[0.8rem]">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <th className="pb-2 pr-4">Name / Email</th>
                <th className="pb-2 pr-4">Registered</th>
                <th className="pb-2 text-right">Days pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {flags.stalePending.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-4">
                    <p className="font-medium text-slate-800">{a.registrationName ?? "—"}</p>
                    <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">{a.email}</p>
                  </td>
                  <td className="py-2 pr-4 text-[color:var(--muted-foreground)]">
                    {a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-2 text-right">
                    <span className="rounded bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 text-[0.7rem] font-medium text-[color:var(--danger)]">
                      {a.daysPending}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </FlagSection>

      {/* 2 — Unlinked active accounts */}
      <FlagSection
        icon={<Link2Off className="h-4 w-4" />}
        title="Active accounts without a player link"
        description="Users are logged in but not linked to a player record"
        count={flags.unlinkedActive.length}
      >
        {flags.unlinkedActive.length > 0 ? (
          <table className="w-full text-[0.8rem]">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <th className="pb-2 pr-4">Name / Email</th>
                <th className="pb-2 text-right">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {flags.unlinkedActive.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-4">
                    <p className="font-medium text-slate-800">{u.registrationName ?? "—"}</p>
                    <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">{u.email}</p>
                  </td>
                  <td className="py-2 text-right text-[color:var(--muted-foreground)]">
                    {u.lastLoginAt
                      ? u.lastLoginAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </FlagSection>

      {/* 3 — Players with multiple accounts */}
      <FlagSection
        icon={<Users className="h-4 w-4" />}
        title="Players linked to multiple accounts"
        description="A player record linked to more than one user account"
        count={flags.multiUserPlayers.length}
      >
        {flags.multiUserPlayers.length > 0 ? (
          <div className="space-y-3">
            {flags.multiUserPlayers.map((p) => (
              <div key={p.playerId} className="rounded-xl border border-[color:var(--border)] p-3">
                <p className="text-[0.85rem] font-medium text-slate-800">{p.playerName}</p>
                <ul className="mt-2 space-y-1">
                  {p.users.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 text-[0.78rem]">
                      <span className={[
                        "rounded px-1.5 py-0.5 text-[0.65rem] font-medium",
                        u.accountStatus === "active"
                          ? "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)]"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}>
                        {u.accountStatus}
                      </span>
                      <span className="text-[color:var(--muted-foreground)]">{u.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </FlagSection>

      {/* 4 — Active players without any account */}
      <FlagSection
        icon={<UserMinus className="h-4 w-4" />}
        title="Active players with no account"
        description="Players in the system who haven&apos;t registered yet"
        count={flags.playersWithoutAccounts.length}
      >
        {flags.playersWithoutAccounts.length > 0 ? (
          <div className="grid gap-1 sm:grid-cols-2">
            {flags.playersWithoutAccounts.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2">
                <span className="flex-1 text-[0.82rem] font-medium text-slate-700">{p.displayName}</span>
                {p.gender?.toLowerCase() === "female" && (
                  <span className="text-[0.65rem] font-medium text-[#E84AA5]">F</span>
                )}
                {p.gender?.toLowerCase() === "male" && (
                  <span className="text-[0.65rem] font-medium text-[#1ED0D8]">M</span>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </FlagSection>
    </div>
  );
}

function FlagSection({
  icon, title, description, count, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="council-panel rounded-2xl border p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className={[
          "mt-0.5 rounded-lg p-1.5",
          count > 0
            ? "bg-[rgba(239,68,68,0.1)] text-[color:var(--danger)]"
            : "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)]",
        ].join(" ")}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[0.88rem] font-semibold text-slate-800">{title}</h3>
            <span className={[
              "rounded-full px-2 py-0.5 text-[0.68rem] font-medium",
              count > 0
                ? "bg-[rgba(239,68,68,0.1)] text-[color:var(--danger)]"
                : "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)]",
            ].join(" ")}>
              {count}
            </span>
          </div>
          <p className="mt-0.5 text-[0.78rem] text-[color:var(--muted-foreground)]">{description}</p>
        </div>
      </div>
      {count === 0 ? (
        <p className="text-[0.82rem] text-[color:var(--success)] opacity-70">No issues found.</p>
      ) : (
        <div className="border-t border-[color:var(--border)] pt-4">{children}</div>
      )}
    </section>
  );
}
