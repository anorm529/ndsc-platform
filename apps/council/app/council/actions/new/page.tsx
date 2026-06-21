import { redirect } from "next/navigation";
import { requireCouncilUser, requireSecretaryAccess } from "@/lib/council-session";
import { getCouncilMembers, memberDisplayName } from "@/lib/main-db";
import { getAllMeetings } from "@/lib/council-queries";
import { createActionItem, createActionItemsForAll } from "@/lib/meeting-actions";

export default async function NewActionPage() {
  const user = await requireCouncilUser();
  await requireSecretaryAccess(user);

  const [members, meetings] = await Promise.all([
    getCouncilMembers(),
    getAllMeetings(),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const title = String(formData.get("title") ?? "").trim();
    const meetingId = String(formData.get("meetingId") ?? "").trim() || undefined;
    const assignedTo = String(formData.get("assignedTo") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim() || undefined;
    const priority = String(formData.get("priority") ?? "medium");
    const description = String(formData.get("description") ?? "").trim();
    if (!title) return;

    const base = {
      meetingId,
      title,
      description: description || undefined,
      dueDate,
      priority,
      createdBy: u.id,
    };

    if (assignedTo === "__all__") {
      const allMembers = await getCouncilMembers();
      await createActionItemsForAll(allMembers.map((m) => m.id), base);
    } else {
      await createActionItem({ ...base, assignedTo: assignedTo || undefined });
    }
    redirect("/council/actions");
  }

  return (
    <div className="max-w-lg">
      <form action={handleCreate} className="council-panel rounded-2xl border p-6 space-y-5">
        <h2 className="text-[0.95rem] font-semibold text-slate-800">New action item</h2>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Action *</span>
          <input
            name="title"
            required
            placeholder="What needs to be done?"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Description</span>
          <textarea
            name="description"
            rows={3}
            placeholder="More detail…"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.88rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)] resize-none"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Assign to</span>
            <select
              name="assignedTo"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">Unassigned</option>
              <option value="__all__">All council members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{memberDisplayName(m)}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Priority</span>
            <select
              name="priority"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Due date</span>
            <input
              name="dueDate"
              type="date"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Linked meeting</span>
            <select
              name="meetingId"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">None</option>
              {meetings.slice(0, 20).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.scheduledAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} — {m.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-3 text-[0.9rem] font-medium text-white hover:brightness-105"
          >
            Create action
          </button>
          <a
            href="/council/actions"
            className="rounded-xl border border-[color:var(--border)] px-5 py-3 text-[0.9rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
