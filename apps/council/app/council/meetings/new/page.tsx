import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCouncilUser, requireSecretaryAccess } from "@/lib/council-session";
import { createMeeting } from "@/lib/meeting-actions";

export default async function NewMeetingPage() {
  const user = await requireCouncilUser();
  await requireSecretaryAccess(user);

  async function handleCreate(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const title = String(formData.get("title") ?? "").trim();
    const type = String(formData.get("type") ?? "council");
    const date = String(formData.get("date") ?? "");
    const time = String(formData.get("time") ?? "19:00");
    const location = String(formData.get("location") ?? "").trim();
    const agenda = String(formData.get("agenda") ?? "").trim();

    if (!title || !date) return;
    const scheduledAt = `${date}T${time}:00`;
    const id = await createMeeting({
      title, type, scheduledAt,
      location: location || undefined,
      agenda: agenda || undefined,
      createdBy: u.id,
    });
    redirect(`/council/meetings/${id}`);
  }

  const today = new Date().toISOString().split("T")[0]!;

  return (
    <div className="max-w-xl">
      <form action={handleCreate} className="council-panel rounded-2xl border p-6 space-y-5">
        <h2 className="text-[0.95rem] font-semibold text-slate-800">Schedule a meeting</h2>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Title *</span>
          <input
            name="title"
            required
            placeholder="e.g. June Council Meeting"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Type</span>
            <select
              name="type"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.88rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="council">Council</option>
              <option value="agm">AGM</option>
              <option value="egm">EGM</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Date *</span>
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.88rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Time</span>
            <input
              name="time"
              type="time"
              defaultValue="19:00"
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-3 text-[0.88rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Location</span>
          <input
            name="location"
            placeholder="e.g. Club house, Zoom"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Agenda</span>
          <textarea
            name="agenda"
            rows={5}
            placeholder="Meeting agenda…"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.88rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)] resize-y"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-3 text-[0.9rem] font-medium text-white hover:brightness-105"
          >
            Schedule meeting
          </button>
          <Link
            href="/council/meetings"
            className="rounded-xl border border-[color:var(--border)] px-5 py-3 text-[0.9rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
