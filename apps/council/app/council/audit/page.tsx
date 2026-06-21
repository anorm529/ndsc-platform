import { ScrollText, ShieldAlert } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAdminAuditLog, type AuditEntry } from "@/lib/audit-queries";
import { redirect } from "next/navigation";

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "account.approve":       "Account approved",
    "account.disable":       "Account disabled",
    "account.role_change":   "Role changed",
    "account.relink_player": "Player re-linked",
    "account.password_reset":"Password reset",
    "account.unlink":        "Player unlinked",
    "account.link":          "Player linked",
  };
  return map[action] ?? action;
}

function actionBadgeClass(action: string): string {
  if (action.includes("approve") || action.includes("link")) {
    return "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)]";
  }
  if (action.includes("disable")) {
    return "bg-[rgba(239,68,68,0.08)] text-[color:var(--danger)]";
  }
  if (action.includes("role") || action.includes("password")) {
    return "bg-[rgba(233,185,62,0.1)] text-[color:var(--warning)]";
  }
  return "bg-slate-100 text-slate-600";
}

function ValuePill({ value, label }: { value: unknown; label: string }) {
  if (value === null || value === undefined) return null;
  const display = typeof value === "object" ? JSON.stringify(value) : String(value).replace(/^"(.*)"$/, "$1");
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem]">
      <span className="text-[color:var(--muted-foreground)]">{label}</span>
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{display}</code>
    </span>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <tr className="border-b border-[color:var(--border)] hover:bg-slate-50/50">
      <td className="py-3 pr-4 align-top">
        <p className="text-[0.68rem] text-[color:var(--muted-foreground)] whitespace-nowrap">
          {formatDateTime(entry.createdAt)}
        </p>
      </td>
      <td className="py-3 pr-4 align-top">
        <span className={`rounded px-1.5 py-0.5 text-[0.67rem] font-medium ${actionBadgeClass(entry.action)}`}>
          {actionLabel(entry.action)}
        </span>
      </td>
      <td className="py-3 pr-4 align-top">
        <p className="text-[0.78rem] font-medium text-slate-800 whitespace-nowrap">
          {entry.actorName ?? "—"}
        </p>
        {entry.actorEmail && entry.actorEmail !== entry.actorName && (
          <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">{entry.actorEmail}</p>
        )}
      </td>
      <td className="py-3 pr-4 align-top">
        <p className="text-[0.78rem] text-slate-700 whitespace-nowrap">
          {entry.targetName ?? entry.targetEmail ?? (entry.targetPlayerId ? `Player ${entry.targetPlayerId.slice(0, 8)}…` : "—")}
        </p>
        {entry.targetEmail && entry.targetEmail !== entry.targetName && (
          <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">{entry.targetEmail}</p>
        )}
      </td>
      <td className="py-3 align-top">
        <div className="flex flex-wrap gap-2">
          {entry.fieldName && (
            <span className="text-[0.65rem] font-medium text-slate-500">{entry.fieldName}</span>
          )}
          <ValuePill value={entry.previousValue} label="from" />
          <ValuePill value={entry.newValue} label="to" />
        </div>
      </td>
    </tr>
  );
}

export default async function AuditPage() {
  const user = await requireCouncilUser();

  // Chairman/owner only
  if (!hasRosterManagementAccess(user)) {
    redirect("/council/dashboard");
  }

  const entries = await getAdminAuditLog(200);

  return (
    <div className="max-w-5xl space-y-6">
      <section className="council-panel rounded-2xl border p-5">
        <div className="mb-5 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.92rem] font-semibold text-slate-800">Account audit log</h3>
          <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
            last {entries.length} entries
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center text-[color:var(--muted-foreground)]">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-[0.9rem]">No audit entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8rem]">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[0.67rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <th className="pb-2 pr-4">When</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Actor</th>
                  <th className="pb-2 pr-4">Target</th>
                  <th className="pb-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => <AuditRow key={e.id} entry={e} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
