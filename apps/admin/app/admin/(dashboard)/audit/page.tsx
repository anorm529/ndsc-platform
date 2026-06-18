import { History } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { getGlobalAuditLog } from "@/lib/admin-audit";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default async function AuditPage() {
  const entries = await getGlobalAuditLog(150);

  return (
    <SectionCard title="Audit Log" subtitle="Recent admin changes across accounts and profiles." icon={History}>
      <div className="admin-scrollbar mt-6 overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[#8b95a5]">
            <tr>
              <th className="border-b border-[color:var(--border)] px-3 py-3">When</th>
              <th className="border-b border-[color:var(--border)] px-3 py-3">Actor</th>
              <th className="border-b border-[color:var(--border)] px-3 py-3">Target</th>
              <th className="border-b border-[color:var(--border)] px-3 py-3">Action</th>
              <th className="border-b border-[color:var(--border)] px-3 py-3">Previous</th>
              <th className="border-b border-[color:var(--border)] px-3 py-3">New</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                  {formatDate(entry.createdAt)}
                </td>
                <td className="border-b border-[color:var(--border)] px-3 py-4 text-white">
                  {entry.actorEmail || "Unknown"}
                </td>
                <td className="border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                  {entry.targetEmail || entry.targetPlayerName || "System"}
                </td>
                <td className="border-b border-[color:var(--border)] px-3 py-4">
                  <span className="font-semibold text-white">{entry.action}</span>
                  {entry.fieldName ? (
                    <span className="ml-2 text-xs text-[#8b95a5]">{entry.fieldName}</span>
                  ) : null}
                </td>
                <td className="max-w-[14rem] truncate border-b border-[color:var(--border)] px-3 py-4 text-[#c5cfdb]">
                  {formatValue(entry.previousValue)}
                </td>
                <td className="max-w-[14rem] truncate border-b border-[color:var(--border)] px-3 py-4 text-white">
                  {formatValue(entry.newValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length ? (
          <p className="mt-4 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[#c5cfdb]">
            No audit entries yet. Run the audit migration to persist future entries.
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
