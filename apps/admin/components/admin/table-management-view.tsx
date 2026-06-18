import { Database } from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { TableManager } from "@/components/admin/table-manager";
import type { NocoTableSnapshot } from "@/lib/nocodb";

export function TableManagementView({
  title,
  subtitle,
  tables,
}: {
  title: string;
  subtitle: string;
  tables: NocoTableSnapshot[];
}) {
  return (
    <SectionCard title={title} subtitle={subtitle} icon={Database} iconClassName="text-[color:var(--accent)]">
      <div className="mt-7 grid gap-5">
        {tables.map((table) => (
          <TableManager key={table.key} table={table} />
        ))}
      </div>
    </SectionCard>
  );
}
