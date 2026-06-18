import { MailCheck, MailWarning } from "lucide-react";
import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { getEmailDeliveryOverview } from "@/lib/email-events";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

function statusClassName(status: string) {
  if (status === "sent" || status === "delivered") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "failed" || status === "bounced") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  return "border-slate-400/15 bg-slate-400/10 text-slate-300";
}

export default async function EmailPage() {
  const overview = await getEmailDeliveryOverview();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Reset sent 24h"
          value={overview.resetSent24h.toLocaleString("en-GB")}
          icon={MailCheck}
          accent="teal"
        />
        <DashboardStatCard
          label="Failed 24h"
          value={overview.resetFailed24h.toLocaleString("en-GB")}
          icon={MailWarning}
          accent="gold"
        />
        <DashboardStatCard
          label="Delivered 7d"
          value={overview.resetDelivered7d.toLocaleString("en-GB")}
          icon={MailCheck}
          accent="blue"
        />
        <DashboardStatCard
          label="Bounced 7d"
          value={overview.resetBounced7d.toLocaleString("en-GB")}
          icon={MailWarning}
          accent="cyan"
        />
      </div>

      <SectionCard
        title="Resend Delivery"
        subtitle="Password reset email delivery health and provider configuration."
        icon={overview.configured ? MailCheck : MailWarning}
      >
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="admin-panel-soft rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
              API key
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {overview.config.apiKeyConfigured ? "Configured" : "Missing"}
            </div>
          </div>
          <div className="admin-panel-soft rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
              From email
            </div>
            <div className="mt-2 truncate text-lg font-semibold text-white">
              {overview.config.fromEmailConfigured ? overview.config.fromEmail : "Missing"}
            </div>
          </div>
          <div className="admin-panel-soft rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
              Event table
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {overview.tableReady ? "Ready" : "Migration needed"}
            </div>
          </div>
          <div className="admin-panel-soft rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
              Last reset sent
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {formatDate(overview.lastResetSentAt)}
            </div>
          </div>
        </div>

        {!overview.tableReady ? (
          <div className="mt-5 rounded-xl border border-[rgba(233,185,62,0.22)] bg-[rgba(94,68,16,0.16)] p-4 text-sm text-[color:var(--warning)]">
            Run the email_events migration before delivery history can be stored.
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Recent Email Events" subtitle="Latest email delivery records stored locally." icon={MailCheck}>
        <div className="admin-scrollbar mt-6 overflow-x-auto">
          <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">
              <tr>
                <th className="border-b border-[color:var(--border)] px-3 py-3">When</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Email</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Type</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Status</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Provider ID</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 text-white">
                    {event.email}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                    {event.type}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusClassName(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="max-w-[14rem] truncate border-b border-[color:var(--border)] px-3 py-4 font-mono text-xs text-[#c5cfdb]">
                    {event.providerMessageId || "-"}
                  </td>
                  <td className="max-w-[18rem] truncate border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                    {event.errorMessage || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!overview.recentEvents.length ? (
            <p className="mt-4 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
              No email events have been logged yet.
            </p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
