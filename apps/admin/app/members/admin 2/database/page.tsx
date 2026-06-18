import Link from "next/link";
import { Database } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { getDatabaseOverview, neonAdminSections } from "@/lib/neon-admin";

export default async function DatabaseOverviewPage() {
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
            DATABASE_URL is not configured. Add your pooled Neon connection string to `.env.local`.
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
