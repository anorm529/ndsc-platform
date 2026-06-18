import { ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { getSecurityOverview } from "@/lib/admin-operations";
import { requireAdminUser } from "@/lib/admin-session";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

export default async function SecurityPage() {
  const adminUser = await requireAdminUser();

  if (adminUser.role !== "owner") {
    return (
      <SectionCard
        title="Owner Only"
        subtitle="Security controls are restricted to owner accounts."
        icon={ShieldCheck}
      >
        <p className="mt-6 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
          Your account can use admin workflows, but only owners can view privileged-user security details.
        </p>
      </SectionCard>
    );
  }

  const security = await getSecurityOverview();

  return (
    <div className="space-y-6">
      <SectionCard title="Privileged Users" subtitle="Owner and admin accounts with active session counts." icon={ShieldCheck}>
        <div className="admin-scrollbar mt-6 overflow-x-auto">
          <table className="min-w-[780px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">
              <tr>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Email</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Role</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Status</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Last login</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {security.privilegedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 font-semibold text-white">
                    {user.email}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 capitalize text-[#c5cfdb]">
                    {user.role}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 capitalize text-[#c5cfdb]">
                    {user.account_status}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-4 text-white">
                    {user.active_sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent Admin Logins" subtitle="Latest owner/admin login timestamps." icon={ShieldCheck}>
          <div className="mt-6 space-y-3">
            {security.recentLogins.map((login) => (
              <div key={`${login.email}-${login.last_login?.toISOString()}`} className="rounded-lg border border-[color:var(--border)] p-3">
                <div className="font-semibold text-white">{login.email}</div>
                <div className="mt-1 text-xs text-[#8b95a5]">{formatDate(login.last_login)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Sensitive Changes" subtitle="Recent role changes, password resets, and disables." icon={ShieldCheck}>
          <div className="mt-6 space-y-3">
            {security.recentSecurityAudit.map((entry) => (
              <div key={`${entry.action}-${entry.created_at.toISOString()}-${entry.target_email}`} className="rounded-lg border border-[color:var(--border)] p-3">
                <div className="font-semibold text-white">{entry.action}</div>
                <div className="mt-1 text-sm text-[#c5cfdb]">
                  {entry.actor_email || "Unknown"} → {entry.target_email || "Unknown"}
                </div>
                <div className="mt-1 text-xs text-[#8b95a5]">{formatDate(entry.created_at)}</div>
              </div>
            ))}
            {!security.recentSecurityAudit.length ? (
              <p className="text-sm text-[#8b95a5]">No sensitive audit entries yet.</p>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
