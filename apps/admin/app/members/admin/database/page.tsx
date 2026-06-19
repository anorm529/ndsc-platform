import Link from "next/link";
import { AlertTriangle, CheckCircle2, Database, Timer } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { getDatabaseOverview, neonAdminSections } from "@/lib/neon-admin";
import { requireAdminPermission } from "@/lib/permissions";

function metricClassName(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") {
    return "border-[rgba(24,213,141,0.2)] bg-[rgba(22,135,91,0.14)]";
  }

  if (tone === "warning") {
    return "border-[rgba(233,185,62,0.22)] bg-[rgba(94,68,16,0.16)]";
  }

  if (tone === "danger") {
    return "border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)]";
  }

  return "border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.58)]";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DatabaseOverviewPage() {
  await requireAdminPermission("database");
  const overview = await getDatabaseOverview();
  const tableByName = new Map(overview.tables.map((table) => [table.tableName, table]));

  return (
    <div className="space-y-6">
      <SectionCard
        title="Neon Database"
        subtitle="Overview of configured Postgres tables and admin entry points."
        icon={Database}
        iconClassName="text-[color:var(--accent)]"
      >
        {!overview.configured ? (
          <div className="mt-5 rounded-xl border border-[rgba(239,75,95,0.25)] bg-[rgba(125,22,38,0.18)] p-4 text-sm text-[color:var(--danger)]">
            {overview.error || "DATABASE_URL is not configured. Add your pooled Neon connection string."}
          </div>
        ) : null}

        {overview.health ? (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {overview.health.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-xl border px-4 py-4 ${metricClassName(metric.tone)}`}
                >
                  <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
                    {metric.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="admin-panel-soft rounded-xl p-4">
                <div className="flex items-center gap-2">
                  {overview.health.recentErrors.length > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
                  )}
                  <h2 className="text-base font-semibold text-white">Recent Upload Errors</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {overview.health.recentErrors.length > 0 ? (
                    overview.health.recentErrors.map((error, index) => (
                      <div
                        key={`${error.message}-${index}`}
                        className="rounded-lg border border-[rgba(233,185,62,0.18)] bg-[rgba(94,68,16,0.12)] px-3 py-3 text-sm"
                      >
                        <p className="text-[color:var(--warning)]">
                          {error.rowNumber ? `Row ${error.rowNumber}: ` : ""}
                          {error.message}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          {formatDate(error.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No recent upload errors were found.
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-panel-soft rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-[color:var(--accent)]" />
                  <h2 className="text-base font-semibold text-white">Recent Imports</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {overview.health.recentBatches.length > 0 ? (
                    overview.health.recentBatches.map((batch, index) => (
                      <div
                        key={`${batch.targetTable}-${index}`}
                        className="rounded-lg border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.58)] px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-white">{batch.targetTable}</p>
                          <span className="text-xs uppercase tracking-[0.12em] text-[#9bb0c6]">
                            {batch.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          Imported {batch.importedRows ?? "-"} of {batch.totalRows ?? "-"} rows |{" "}
                          {formatDate(batch.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No import batches have been logged yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {neonAdminSections.map((section) => (
            <Link
              key={section.slug}
              href={`/members/admin/${section.slug}`}
              className="admin-panel-soft rounded-xl p-4 hover:border-[color:var(--accent)]"
            >
              <h2 className="text-lg font-semibold text-white">{section.label}</h2>
              <p className="mt-2 min-h-10 text-sm text-[color:var(--muted-foreground)]">
                {section.description}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                {section.tables.map((tableName) => {
                  const table = tableByName.get(tableName);

                  return (
                    <p key={tableName} className="flex justify-between gap-3 text-[#cbd5e1]">
                      <span>{tableName}</span>
                      <span>
                        {table
                          ? table.exists
                            ? `${table.totalRows} rows`
                            : "missing"
                          : "not checked"}
                      </span>
                    </p>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
