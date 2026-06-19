import Link from "next/link";
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  CircleOff,
  LinkIcon,
  Sparkles,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { SectionCard } from "@/components/admin/section-card";
import { getAccounts, getAccountSummary } from "@/lib/admin-accounts";
import { requireAdminUser } from "@/lib/admin-session";
import { requireAdminPermission } from "@/lib/permissions";
import {
  approveUserAction,
  bulkApproveAction,
  changeRoleAction,
  disableUserAction,
} from "./actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

function pillClassName(tone: "green" | "gold" | "red" | "blue" | "muted") {
  const tones = {
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    gold: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
    red: "border-red-400/20 bg-red-400/10 text-red-200",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    muted: "border-slate-400/15 bg-slate-400/10 text-slate-300",
  };

  return `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${tones[tone]}`;
}

export default async function AccountsPage({ searchParams }: PageProps) {
  await requireAdminPermission("accounts");
  const params = await searchParams;
  const filters = {
    status: firstParam(params?.status) || "",
    role: firstParam(params?.role) || "",
    link: firstParam(params?.link) || "",
    q: firstParam(params?.q) || "",
  };
  const [adminUser, summary, accounts] = await Promise.all([
    requireAdminUser(),
    getAccountSummary(),
    getAccounts(filters),
  ]);

  const readyToApprove = accounts.filter(
    (a) => a.accountStatus === "pending" && a.emailVerified && a.playerId,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Pending users"
          value={String(summary.pendingUsers)}
          icon={AlertCircle}
          accent="gold"
        />
        <DashboardStatCard
          label="Active users"
          value={String(summary.activeUsers)}
          icon={CheckCircle2}
          accent="teal"
        />
        <DashboardStatCard
          label="Disabled users"
          value={String(summary.disabledUsers)}
          icon={CircleOff}
          accent="blue"
        />
        <DashboardStatCard
          label="Unlinked users"
          value={String(summary.unlinkedUsers)}
          icon={LinkIcon}
          accent="cyan"
        />
      </div>

      <SectionCard title="Accounts" subtitle="Approve, filter, link, and manage member platform access." icon={Users}>
        {readyToApprove.length > 0 ? (
          <form action={bulkApproveAction} className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-4">
            {readyToApprove.map((a) => (
              <input key={a.id} type="hidden" name="userId" value={a.id} />
            ))}
            <div className="flex items-center gap-3">
              <CheckCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="text-sm">
                <span className="font-semibold text-emerald-300">
                  {readyToApprove.length} account{readyToApprove.length === 1 ? "" : "s"} ready to approve
                </span>
                <span className="ml-2 text-[#c5cfdb]">— email verified and player linked</span>
              </div>
            </div>
            <FormSubmitButton idleLabel="Approve all" pendingLabel="Approving…" />
          </form>
        ) : null}

        <form className={`${readyToApprove.length > 0 ? "mt-4" : "mt-6"} grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_auto]`}>
          <label className="admin-panel-soft flex h-11 items-center gap-3 rounded-lg px-3">
            <Search className="h-4 w-4 text-[#8d97a7]" />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Search email or player"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7f8a9a]"
            />
          </label>
          <select
            name="status"
            defaultValue={filters.status}
            className="admin-panel-soft h-11 rounded-lg px-3 text-sm text-white outline-none"
          >
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            name="role"
            defaultValue={filters.role}
            className="admin-panel-soft h-11 rounded-lg px-3 text-sm text-white outline-none"
          >
            <option value="">Any role</option>
            <option value="player">Player</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <select
            name="link"
            defaultValue={filters.link}
            className="admin-panel-soft h-11 rounded-lg px-3 text-sm text-white outline-none"
          >
            <option value="">Any link state</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
          <button
            type="submit"
            className="admin-panel-soft h-11 rounded-lg px-5 text-sm font-semibold text-[color:var(--accent)]"
          >
            Filter
          </button>
        </form>

        <div className="admin-scrollbar mt-5 overflow-x-auto">
          <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">
              <tr>
                <th className="border-b border-[color:var(--border)] px-3 py-3">User</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Role</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Status</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Linked player</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Last login</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const isOwnerTarget = account.role === "owner";
                const canMutate = adminUser.role === "owner" || !isOwnerTarget;
                const canAssignOwner = adminUser.role === "owner";

                return (
                  <tr key={account.id} className="border-b border-[color:var(--border)]">
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <Link href={`/admin/accounts/${account.id}`} className="font-semibold text-white hover:text-[color:var(--accent)]">
                        {account.email}
                      </Link>
                      <div className="mt-1 text-xs text-[#8b95a5]">
                        Created {formatDate(account.createdAt)}
                      </div>
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <span className={pillClassName(account.role === "owner" ? "blue" : account.role === "admin" ? "green" : "muted")}>
                        {account.role}
                      </span>
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <span className={pillClassName(account.accountStatus === "active" ? "green" : account.accountStatus === "pending" ? "gold" : "red")}>
                        {account.accountStatus}
                      </span>
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <div className="text-white">{account.playerName || "Unlinked"}</div>
                      <div className="mt-1 text-xs text-[#8b95a5]">{account.membershipStatus || (account.playerId ? "Linked" : "No player record")}</div>
                      {!account.playerId && account.suggestedPlayers.length ? (
                        <div className="mt-3 space-y-1 rounded-lg border border-yellow-400/15 bg-yellow-400/5 p-2">
                          <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-yellow-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Suggested
                          </div>
                          {account.suggestedPlayers.slice(0, 2).map((player) => (
                            <Link
                              key={player.id}
                              href={`/admin/accounts/${account.id}?playerSearch=${encodeURIComponent(player.displayName)}`}
                              className="block truncate text-xs font-medium text-white hover:text-[color:var(--accent)]"
                            >
                              {player.displayName}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                      {formatDate(account.lastLogin)}
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        {account.accountStatus === "pending" && canMutate ? (
                          account.emailVerified && account.playerId ? (
                            <form action={approveUserAction}>
                              <input type="hidden" name="userId" value={account.id} />
                              <FormSubmitButton idleLabel="Approve" pendingLabel="Approving..." />
                            </form>
                          ) : (
                            <Link
                              href={`/admin/accounts/${account.id}`}
                              className="inline-flex h-9 items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-semibold text-orange-300 hover:bg-orange-500/20"
                            >
                              Needs action
                            </Link>
                          )
                        ) : null}
                        {account.accountStatus !== "disabled" && canMutate ? (
                          <form action={disableUserAction}>
                            <input type="hidden" name="userId" value={account.id} />
                            <input type="hidden" name="confirmation" value="DISABLE" />
                            <FormSubmitButton idleLabel="Disable" pendingLabel="Disabling..." variant="danger" />
                          </form>
                        ) : null}
                        {canMutate ? (
                          <form action={changeRoleAction} className="flex gap-2">
                            <input type="hidden" name="userId" value={account.id} />
                            <select
                              name="role"
                              defaultValue={account.role}
                              className="admin-panel-soft h-10 rounded-full px-3 text-xs text-white outline-none"
                            >
                              <option value="player">Player</option>
                              <option value="admin">Admin</option>
                              {canAssignOwner ? <option value="owner">Owner</option> : null}
                            </select>
                            <FormSubmitButton idleLabel="Save role" pendingLabel="Saving..." variant="ghost" />
                          </form>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs text-[#8b95a5]">
                            <ShieldCheck className="h-4 w-4" />
                            Owner protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
