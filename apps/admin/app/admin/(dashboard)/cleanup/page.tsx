import { Trash2 } from "lucide-react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { SectionCard } from "@/components/admin/section-card";
import { getCleanupOverview } from "@/lib/admin-operations";
import {
  deleteOldEmailEventsAction,
  deleteExpiredResetTokensAction,
  deleteExpiredSessionsAction,
} from "./actions";
import { requireAdminPermission } from "@/lib/permissions";

export default async function CleanupPage() {
  await requireAdminPermission("cleanup");
  const cleanup = await getCleanupOverview();

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <SectionCard title="Expired Sessions" subtitle="Remove sessions that can no longer authenticate." icon={Trash2}>
        <div className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white">
          {cleanup.expiredSessions.toLocaleString("en-GB")}
        </div>
        <form action={deleteExpiredSessionsAction} className="mt-5 flex flex-wrap gap-3">
          <input
            name="confirmation"
            placeholder="Type DELETE SESSIONS"
            className="admin-panel-soft h-10 min-w-[16rem] rounded-full px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
            required
          />
          <FormSubmitButton idleLabel="Delete expired sessions" pendingLabel="Deleting..." variant="danger" />
        </form>
      </SectionCard>

      <SectionCard title="Expired Reset Tokens" subtitle="Remove unused password reset tokens that have expired." icon={Trash2}>
        <div className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white">
          {cleanup.expiredResetTokens.toLocaleString("en-GB")}
        </div>
        <form action={deleteExpiredResetTokensAction} className="mt-5 flex flex-wrap gap-3">
          <input
            name="confirmation"
            placeholder="Type DELETE TOKENS"
            className="admin-panel-soft h-10 min-w-[16rem] rounded-full px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
            required
          />
          <FormSubmitButton idleLabel="Delete expired tokens" pendingLabel="Deleting..." variant="danger" />
        </form>
      </SectionCard>

      <SectionCard title="Old Email Events" subtitle="Remove email delivery events older than 180 days." icon={Trash2}>
        <div className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white">
          {cleanup.oldEmailEvents.toLocaleString("en-GB")}
        </div>
        <form action={deleteOldEmailEventsAction} className="mt-5 flex flex-wrap gap-3">
          <input
            name="confirmation"
            placeholder="Type DELETE EMAIL EVENTS"
            className="admin-panel-soft h-10 min-w-[16rem] rounded-full px-3 text-sm text-white outline-none placeholder:text-[#7f8a9a]"
            required
          />
          <FormSubmitButton idleLabel="Delete old events" pendingLabel="Deleting..." variant="danger" />
        </form>
      </SectionCard>
    </div>
  );
}
