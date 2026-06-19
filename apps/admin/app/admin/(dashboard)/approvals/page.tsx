import Link from "next/link";
import { CheckCircle2, LinkIcon } from "lucide-react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { SectionCard } from "@/components/admin/section-card";
import { getApprovalQueue } from "@/lib/admin-operations";
import {
  approveUserAction,
  disableUserAction,
  relinkUserAction,
} from "../accounts/actions";
import { requireAdminPermission } from "@/lib/permissions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function ApprovalsPage() {
  await requireAdminPermission("approvals");
  const queue = await getApprovalQueue();

  return (
    <SectionCard
      title="Approval Queue"
      subtitle="Resolve pending account requests with player suggestions and quick actions."
      icon={CheckCircle2}
    >
      <div className="mt-6 space-y-3">
        {queue.map((account) => (
          <div key={account.id} className="admin-panel-soft rounded-xl p-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr_auto]">
              <div className="min-w-0">
                <Link
                  href={`/admin/accounts/${account.id}`}
                  className="block truncate font-semibold text-white hover:text-[color:var(--accent)]"
                >
                  {account.email}
                </Link>
                <div className="mt-1 text-xs text-[#8b95a5]">
                  Requested {formatDate(account.created_at)}
                </div>
                <div className="mt-2 text-sm text-[#c5cfdb]">
                  Current link: {account.player_name || "Unlinked"}
                </div>
              </div>

              <form action={relinkUserAction} className="space-y-2">
                <input type="hidden" name="userId" value={account.id} />
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8b95a5]">
                  <LinkIcon className="h-4 w-4" />
                  Suggested player
                </label>
                <select
                  name="playerId"
                  defaultValue={account.player_id || ""}
                  className="admin-panel-soft h-10 w-full rounded-lg px-3 text-sm text-white outline-none"
                >
                  <option value="">Leave unlinked</option>
                  {account.suggested_players?.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName} · score {player.matchScore}
                    </option>
                  ))}
                </select>
                <FormSubmitButton idleLabel="Save link" pendingLabel="Saving..." variant="ghost" />
              </form>

              <div className="flex flex-wrap items-end gap-2">
                <form action={approveUserAction}>
                  <input type="hidden" name="userId" value={account.id} />
                  <FormSubmitButton idleLabel="Approve" pendingLabel="Approving..." />
                </form>
                <form action={disableUserAction}>
                  <input type="hidden" name="userId" value={account.id} />
                  <input type="hidden" name="confirmation" value="DISABLE" />
                  <FormSubmitButton idleLabel="Deny" pendingLabel="Denying..." variant="danger" />
                </form>
              </div>
            </div>
          </div>
        ))}
        {!queue.length ? (
          <p className="rounded-xl border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
            No pending approvals.
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
