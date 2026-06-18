import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { NeonTableAdmin } from "@/components/admin/neon-table-admin";
import { SectionCard } from "@/components/admin/section-card";
import {
  getNeonAdminSection,
  getTableAdminData,
} from "@/lib/neon-admin";
import { archiveSeasonStatsAction, refreshSeasonStatsAction } from "@/app/members/admin/actions";

export default async function NeonAdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionSlug } = await params;
  const section = getNeonAdminSection(sectionSlug);

  if (!section || section.slug === "uploads") {
    notFound();
  }

  const tables = await Promise.all(section.tables.map((tableName) => getTableAdminData(tableName)));

  return (
    <div className="space-y-6">
      <SectionCard
        title={section.label}
        subtitle={section.description}
        icon={BarChart3}
        iconClassName="text-[color:var(--accent)]"
      >
        {section.slug === "eos-stats" ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <form action={refreshSeasonStatsAction} className="admin-panel-soft rounded-xl p-4">
              <h2 className="font-semibold text-white">Refresh generated stats</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  name="year"
                  placeholder="Year optional"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
                <input
                  name="teamSlug"
                  placeholder="Team slug optional"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
              </div>
              <button className="mt-4 h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d]">
                Run refresh
              </button>
            </form>

            <form action={archiveSeasonStatsAction} className="admin-panel-soft rounded-xl p-4">
              <h2 className="font-semibold text-white">Archive completed season</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  name="year"
                  placeholder="Year"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
                <input
                  name="archivedBy"
                  placeholder="Archived by"
                  defaultValue="admin"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
              </div>
              <button className="mt-4 h-10 rounded-full border border-[color:var(--border-strong)] px-5 text-sm font-semibold text-white">
                Archive
              </button>
            </form>
          </div>
        ) : null}
      </SectionCard>

      {tables.map((table) => (
        <NeonTableAdmin key={table.tableName} table={table} />
      ))}
    </div>
  );
}
