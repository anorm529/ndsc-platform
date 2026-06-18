import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Database,
  HeartPulse,
  Table2,
  Users,
} from "lucide-react";
import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { getAdminOverview } from "@/lib/admin-overview";

function metricClassName(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") {
    return "border-[rgba(24,213,141,0.2)] bg-[rgba(22,135,91,0.14)] text-[color:var(--success)]";
  }

  if (tone === "warning") {
    return "border-[rgba(233,185,62,0.22)] bg-[rgba(94,68,16,0.16)] text-[color:var(--warning)]";
  }

  if (tone === "danger") {
    return "border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] text-[color:var(--danger)]";
  }

  return "border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.58)] text-white";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function tableLabel(tableName: string) {
  return tableName.replaceAll("_", " ");
}

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  const totalRecords = overview.tables.reduce(
    (sum, table) => sum + (table.count ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Connection"
          value={overview.connectionMs === null ? "Off" : `${overview.connectionMs}ms`}
          icon={HeartPulse}
          accent={overview.configured ? "teal" : "gold"}
        />
        <DashboardStatCard
          label="Tracked records"
          value={totalRecords.toLocaleString("en-GB")}
          icon={Database}
          accent="blue"
        />
        <DashboardStatCard
          label="Core tables"
          value={`${overview.tables.filter((table) => table.exists).length}/${overview.tables.length}`}
          icon={Table2}
          accent="cyan"
        />
        <DashboardStatCard
          label="Open flags"
          value={String(overview.flags.filter((flag) => flag.tone !== "success").length)}
          icon={AlertTriangle}
          accent="gold"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="System Health"
          subtitle={`Last checked ${formatDate(overview.checkedAt)}`}
          icon={HeartPulse}
        >
          {!overview.configured ? (
            <div className="mt-6 rounded-xl border border-[rgba(239,75,95,0.25)] bg-[rgba(125,22,38,0.18)] p-4 text-sm text-[color:var(--danger)]">
              {overview.error || "DATABASE_URL is not configured."}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {overview.metrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-xl border px-4 py-4 ${metricClassName(metric.tone)}`}
              >
                <div className="text-xs uppercase tracking-[0.14em] text-[#8ea0b4]">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Flags"
          subtitle="Items that may need admin attention."
          icon={CircleHelp}
        >
          <div className="mt-6 space-y-3">
            {overview.flags.map((flag) => {
              const Icon = flag.tone === "success" ? CheckCircle2 : AlertTriangle;
              const content = (
                <div className={`rounded-xl border p-4 ${metricClassName(flag.tone)}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{flag.label}</div>
                      <div className="mt-1 text-sm text-[#c5cfdb]">{flag.detail}</div>
                    </div>
                  </div>
                </div>
              );

              return flag.href ? (
                <Link key={`${flag.label}-${flag.detail}`} href={flag.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={`${flag.label}-${flag.detail}`}>{content}</div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Live Record Counts"
        subtitle="Core account, player, profile, session, token, and audit tables."
        icon={Users}
      >
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.tables.map((table) => (
            <Link
              key={table.tableName}
              href={
                table.tableName === "users"
                  ? "/admin/accounts"
                  : "/members/admin/database"
              }
              className="admin-panel-soft rounded-xl p-4 hover:border-[color:var(--accent)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold capitalize text-white">
                    {tableLabel(table.tableName)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[#8b95a5]">
                    {table.tableName}
                  </div>
                </div>
                <span
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
                    table.exists
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/20 bg-red-400/10 text-red-200",
                  ].join(" ")}
                >
                  {table.exists ? "Live" : "Missing"}
                </span>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">
                {table.count === null ? "-" : table.count.toLocaleString("en-GB")}
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
