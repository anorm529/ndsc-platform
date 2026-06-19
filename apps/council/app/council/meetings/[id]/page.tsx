import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, MapPin, FileText, CheckSquare,
  Clock, CheckCircle2, AlertCircle, Plus,
} from "lucide-react";
import { requireCouncilUser, hasSecretaryAccess } from "@/lib/council-session";
import { getMeetingById } from "@/lib/council-queries";
import { getMeetingActions, createActionItem, updateMeeting } from "@/lib/meeting-actions";
import { getAllActiveMembers, memberDisplayName } from "@/lib/main-db";

const PRIORITY_COLOURS = {
  high:   "bg-[rgba(239,75,95,0.14)] text-[color:var(--danger)]",
  medium: "bg-[rgba(233,185,62,0.14)] text-[color:var(--warning)]",
  low:    "bg-[rgba(115,145,176,0.12)] text-[color:var(--muted-foreground)]",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In progress", completed: "Done", cancelled: "Cancelled",
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCouncilUser();
  const canManage = hasSecretaryAccess(user);

  const [meeting, actions, members] = await Promise.all([
    getMeetingById(id),
    getMeetingActions(id),
    getAllActiveMembers(),
  ]);

  if (!meeting) notFound();

  async function handleUpdateMinutes(formData: FormData) {
    "use server";
    await requireCouncilUser();
    const minutes = String(formData.get("minutes") ?? "").trim();
    const status = String(formData.get("status") ?? meeting!.status);
    await updateMeeting(id, { minutes, status });
    redirect(`/council/meetings/${id}`);
  }

  async function handleAddAction(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const title = String(formData.get("title") ?? "").trim();
    const assignedTo = String(formData.get("assignedTo") ?? "").trim() || undefined;
    const dueDate = String(formData.get("dueDate") ?? "").trim() || undefined;
    const priority = String(formData.get("priority") ?? "medium");
    const description = String(formData.get("description") ?? "").trim();
    if (!title) return;
    await createActionItem({
      meetingId: id,
      assignedTo,
      title,
      description: description || undefined,
      dueDate,
      priority,
      createdBy: u.id,
    });
    redirect(`/council/meetings/${id}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/council/meetings" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        Meetings
      </Link>

      {/* Meeting header */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.15rem] font-semibold text-white">{meeting.title}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-[0.78rem] text-[color:var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {meeting.scheduledAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {" at "}
                {meeting.scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {meeting.location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {meeting.location}
                </span>
              ) : null}
            </div>
          </div>
          <span className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-medium capitalize",
            meeting.status === "scheduled" ? "bg-[rgba(29,215,207,0.1)] text-[color:var(--accent)]" :
            meeting.status === "completed" ? "bg-[rgba(24,213,141,0.1)] text-[color:var(--success)]" :
            "bg-[rgba(115,145,176,0.1)] text-[color:var(--muted-foreground)]",
          ].join(" ")}>
            {meeting.status}
          </span>
        </div>

        {/* Agenda */}
        {meeting.agenda ? (
          <div className="mt-4 rounded-xl bg-[rgba(10,24,41,0.5)] p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-widest text-[#4a5568]">
              <FileText className="h-3 w-3" />
              Agenda
            </p>
            <p className="whitespace-pre-wrap text-[0.85rem] text-[#c8d5e2]">{meeting.agenda}</p>
          </div>
        ) : null}
      </div>

      {/* Minutes */}
      {canManage ? (
        <section className="council-panel rounded-2xl border p-5">
          <h3 className="mb-3 text-[0.88rem] font-semibold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--accent)]" />
            Minutes
          </h3>
          <form action={handleUpdateMinutes} className="space-y-3">
            <textarea
              name="minutes"
              rows={8}
              defaultValue={meeting.minutes ?? ""}
              placeholder="Record meeting minutes here…"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-4 py-3 text-[0.88rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)] resize-y"
            />
            <div className="flex items-center gap-3">
              <select
                name="status"
                defaultValue={meeting.status}
                className="rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2.5 text-[0.85rem] text-white outline-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[linear-gradient(180deg,#3b837d_0%,#31756e_100%)] py-2.5 text-[0.88rem] font-medium text-[#04101a] hover:brightness-105"
              >
                Save minutes
              </button>
            </div>
          </form>
        </section>
      ) : meeting.minutes ? (
        <section className="council-panel rounded-2xl border p-5">
          <h3 className="mb-3 text-[0.88rem] font-semibold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--accent)]" />
            Minutes
          </h3>
          <p className="whitespace-pre-wrap text-[0.85rem] text-[#c8d5e2]">{meeting.minutes}</p>
        </section>
      ) : null}

      {/* Action items from this meeting */}
      <section className="council-panel rounded-2xl border p-5">
        <h3 className="mb-4 text-[0.88rem] font-semibold text-white flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-[color:var(--accent)]" />
          Action items ({actions.length})
        </h3>

        {/* Add action form */}
        {canManage ? (
          <form action={handleAddAction} className="mb-5 space-y-3 rounded-xl border border-dashed border-[color:var(--border)] p-4">
            <p className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Add action item</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                name="title"
                required
                placeholder="Action *"
                className="sm:col-span-2 rounded-lg border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2 text-[0.82rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)]"
              />
              <select
                name="priority"
                className="rounded-lg border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2 text-[0.82rem] text-white outline-none"
              >
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                name="assignedTo"
                className="rounded-lg border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2 text-[0.82rem] text-white outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberDisplayName(m)}</option>
                ))}
              </select>
              <input
                name="dueDate"
                type="date"
                className="rounded-lg border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2 text-[0.82rem] text-white outline-none"
              />
            </div>
            <input
              name="description"
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2 text-[0.82rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)]"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[rgba(29,215,207,0.12)] py-2 text-[0.82rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(29,215,207,0.2)]"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Add action
            </button>
          </form>
        ) : null}

        {actions.length === 0 ? (
          <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">No action items recorded.</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((a) => {
              const assignedMember = a.assigned_to ? members.find((m) => m.id === a.assigned_to) : null;
              return (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.4)] p-3">
                  {a.status === "completed" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                  ) : a.due_date && new Date(a.due_date) < new Date() && a.status !== "cancelled" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--danger)]" />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={["text-[0.88rem] font-medium", a.status === "completed" ? "line-through text-[color:var(--muted-foreground)]" : "text-white"].join(" ")}>
                      {a.title}
                    </p>
                    {a.description ? (
                      <p className="mt-0.5 text-[0.75rem] text-[color:var(--muted-foreground)]">{a.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {assignedMember ? (
                        <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">
                          → {memberDisplayName(assignedMember)}
                        </span>
                      ) : null}
                      {a.due_date ? (
                        <span className={[
                          "text-[0.7rem]",
                          a.status !== "completed" && new Date(a.due_date) < new Date()
                            ? "text-[color:var(--danger)]"
                            : "text-[color:var(--muted-foreground)]",
                        ].join(" ")}>
                          Due {new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${PRIORITY_COLOURS[a.priority as keyof typeof PRIORITY_COLOURS]}`}>
                      {a.priority}
                    </span>
                    <span className="text-[0.65rem] text-[color:var(--muted-foreground)]">
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
