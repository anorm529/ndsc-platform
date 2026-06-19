import Link from "next/link";
import { CalendarDays, Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireCouncilUser, hasSecretaryAccess } from "@/lib/council-session";
import { getAllMeetings } from "@/lib/council-queries";

const TYPE_LABELS: Record<string, string> = {
  agm: "AGM",
  council: "Council",
  committee: "Committee",
};

const STATUS_CONFIG = {
  scheduled: { icon: Clock, colour: "text-[color:var(--accent)]", label: "Upcoming" },
  completed: { icon: CheckCircle2, colour: "text-[color:var(--success)]", label: "Completed" },
  cancelled: { icon: XCircle, colour: "text-[color:var(--muted-foreground)]", label: "Cancelled" },
};

export default async function MeetingsPage() {
  const user = await requireCouncilUser();
  const canManage = hasSecretaryAccess(user);

  const meetings = await getAllMeetings();

  // Group by year/month
  const groups = new Map<string, typeof meetings>();
  for (const m of meetings) {
    const key = m.scheduledAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const existing = groups.get(key) ?? [];
    existing.push(m);
    groups.set(key, existing);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">
          <span className="font-semibold text-white">{meetings.length}</span> meetings total
        </p>
        {canManage ? (
          <Link
            href="/council/meetings/new"
            className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-muted)] px-4 py-2.5 text-[0.85rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(29,215,207,0.2)]"
          >
            <Plus className="h-4 w-4" />
            New meeting
          </Link>
        ) : null}
      </div>

      {meetings.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No meetings yet.
          {canManage ? (
            <><br /><Link href="/council/meetings/new" className="mt-2 inline-block text-[color:var(--accent)] hover:underline">Schedule the first one</Link></>
          ) : null}
        </div>
      ) : (
        Array.from(groups.entries()).map(([monthLabel, monthMeetings]) => (
          <section key={monthLabel}>
            <h2 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-widest text-[#4a5568]">
              {monthLabel}
            </h2>
            <div className="space-y-2">
              {monthMeetings.map((m) => {
                const cfg = STATUS_CONFIG[m.status];
                const Icon = cfg.icon;
                return (
                  <Link
                    key={m.id}
                    href={`/council/meetings/${m.id}`}
                    className="council-panel group flex items-center gap-4 rounded-xl border p-4 hover:border-[color:var(--border-strong)] hover:bg-[rgba(29,215,207,0.02)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[rgba(29,215,207,0.08)]">
                      <span className="text-[0.55rem] font-bold uppercase text-[color:var(--accent)]">
                        {m.scheduledAt.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                      <span className="text-[1.1rem] font-bold leading-tight text-white">
                        {m.scheduledAt.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.92rem] font-medium text-white group-hover:text-[color:var(--accent)]">
                        {m.title}
                      </p>
                      <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">
                        {m.scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        {m.location ? ` · ${m.location}` : ""}
                        {" · "}{TYPE_LABELS[m.type] ?? m.type}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${cfg.colour}`} />
                      <span className={`text-[0.72rem] ${cfg.colour}`}>{cfg.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
