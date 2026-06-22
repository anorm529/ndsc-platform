import { Megaphone, Send, Users, Shield, UserCheck } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getAnnouncements } from "@/lib/council-queries";
import { getAllTeams } from "@/lib/season-queries";
import { AnnouncementForm } from "./announcement-form";

const RECIPIENT_LABELS: Record<string, string> = {
  all_enrolled: "All enrolled players",
  all_captains: "All captains",
  all_council: "All council members",
  team: "Team",
};

const RECIPIENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  all_enrolled: Users,
  all_captains: Shield,
  all_council: UserCheck,
  team: Shield,
};

export default async function AnnouncementsPage() {
  const user = await requireCouncilUser();
  const [announcements, teams] = await Promise.all([
    getAnnouncements(),
    getAllTeams(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-[1.05rem] font-semibold text-slate-800">Announcements</h2>
        <p className="mt-0.5 text-[0.8rem] text-[color:var(--muted-foreground)]">
          Send emails to players, captains, or the full council
        </p>
      </div>

      {/* Compose */}
      <section className="council-panel rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.9rem] font-semibold text-slate-800">New announcement</h3>
        </div>
        <AnnouncementForm teams={teams} />
      </section>

      {/* History */}
      {announcements.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h3 className="text-[0.9rem] font-semibold text-slate-800">Sent announcements</h3>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => {
              const Icon = RECIPIENT_ICONS[a.recipients] ?? Users;
              const recipientLabel = a.recipients === "team" && a.teamName
                ? a.teamName
                : RECIPIENT_LABELS[a.recipients] ?? a.recipients;
              return (
                <div key={a.id} className="rounded-xl border border-[color:var(--border)] p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--muted-foreground)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.88rem] font-semibold text-slate-800">{a.subject}</p>
                      <p className="mt-0.5 line-clamp-2 text-[0.78rem] text-[color:var(--muted-foreground)]">
                        {a.body}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem] text-[color:var(--muted-foreground)]">
                        <span>→ {recipientLabel}</span>
                        <span>
                          {a.sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" at "}
                          {a.sentAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[color:var(--success)]">{a.sentCount} sent</span>
                        {a.failedCount > 0 && (
                          <span className="text-[color:var(--danger)]">{a.failedCount} failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {announcements.length === 0 && (
        <div className="council-panel rounded-2xl border p-8 text-center text-[color:var(--muted-foreground)]">
          <Megaphone className="mx-auto mb-3 h-7 w-7 opacity-30" />
          <p className="text-[0.88rem]">No announcements sent yet.</p>
        </div>
      )}
    </div>
  );
}
