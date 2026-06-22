import Link from "next/link";
import { Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { requireCouncilUser, hasSecretaryAccess } from "@/lib/council-session";
import { getAllActions, type ActionItem } from "@/lib/council-queries";
import { getAllActiveMembers, memberDisplayName } from "@/lib/main-db";
import { updateActionStatus } from "@/lib/meeting-actions";
import { redirect } from "next/navigation";

const PRIORITY_COLOURS = {
  high:   "bg-[rgba(239,68,68,0.14)] text-[color:var(--danger)]",
  medium: "bg-[rgba(233,185,62,0.14)] text-[color:var(--warning)]",
  low:    "bg-[rgba(115,145,176,0.12)] text-[color:var(--muted-foreground)]",
};

export default async function ActionsPage() {
  const user = await requireCouncilUser();
  const canManage = hasSecretaryAccess(user);

  const [openActions, members] = await Promise.all([
    getAllActions(canManage ? {} : { assignedTo: user.id }),
    getAllActiveMembers(),
  ]);

  const memberById = new Map(members.map((m) => [m.id, m]));

  const open = openActions.filter((a) => a.status === "open" || a.status === "in_progress");
  const closed = openActions.filter((a) => a.status === "completed" || a.status === "cancelled");

  async function handleStatusChange(formData: FormData) {
    "use server";
    await requireCouncilUser();
    const actionId = String(formData.get("actionId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (actionId && status) await updateActionStatus(actionId, status);
    redirect("/council/actions");
  }

  function ActionCard({ a }: { a: ActionItem }) {
    const assignee = a.assignedTo ? memberById.get(a.assignedTo) : null;
    const overdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "completed" && a.status !== "cancelled";
    const isMyAction = a.assignedTo === user.id;

    return (
      <div className={[
        "rounded-xl border p-4",
        a.status === "completed" ? "border-[rgba(16,185,129,0.12)] bg-[rgba(16,185,129,0.05)]" :
        overdue ? "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)]" :
        isMyAction ? "border-[rgba(20,184,166,0.15)] bg-[rgba(20,184,166,0.03)]" :
        "border-[color:var(--border)] bg-slate-50/50",
      ].join(" ")}>
        <div className="flex items-start gap-3">
          {a.status === "completed" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
          ) : overdue ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--danger)]" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className={["text-[0.88rem] font-medium", a.status === "completed" ? "line-through text-[color:var(--muted-foreground)]" : "text-slate-800"].join(" ")}>
                {a.title}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${PRIORITY_COLOURS[a.priority]}`}>
                {a.priority}
              </span>
            </div>

            {a.description ? (
              <p className="mt-1 text-[0.78rem] text-[color:var(--muted-foreground)]">{a.description}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-[color:var(--muted-foreground)]">
              {assignee ? (
                <span className={isMyAction ? "font-semibold text-[color:var(--accent)]" : ""}>
                  → {memberDisplayName(assignee)}{isMyAction ? " (you)" : ""}
                </span>
              ) : <span>Unassigned</span>}
              {a.dueDate ? (
                <span className={overdue ? "text-[color:var(--danger)]" : ""}>
                  Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              ) : null}
              {a.meetingTitle ? (
                <Link href={`/council/meetings/${a.meetingId}`} className="hover:text-[color:var(--accent)]">
                  From: {a.meetingTitle}
                </Link>
              ) : null}
            </div>

            {/* Status toggle */}
            {(canManage || isMyAction) && a.status !== "cancelled" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {a.status !== "in_progress" && a.status !== "completed" ? (
                  <form action={handleStatusChange}>
                    <input type="hidden" name="actionId" value={a.id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <button type="submit" className="rounded-lg bg-[rgba(20,184,166,0.1)] px-2.5 py-1 text-[0.7rem] text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.2)]">
                      Mark in progress
                    </button>
                  </form>
                ) : null}
                {a.status !== "completed" ? (
                  <form action={handleStatusChange}>
                    <input type="hidden" name="actionId" value={a.id} />
                    <input type="hidden" name="status" value="completed" />
                    <button type="submit" className="rounded-lg bg-[rgba(16,185,129,0.1)] px-2.5 py-1 text-[0.7rem] text-[color:var(--success)] hover:bg-[rgba(16,185,129,0.2)]">
                      Mark complete
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">
          <span className="font-semibold text-slate-800">{open.length}</span> open ·{" "}
          <span>{closed.length}</span> closed
          {!canManage && <span className="ml-1">(your actions)</span>}
        </p>
        {canManage ? (
          <Link
            href="/council/actions/new"
            className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-muted)] px-4 py-2.5 text-[0.85rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.2)]"
          >
            <Plus className="h-4 w-4" />
            New action
          </Link>
        ) : null}
      </div>

      {/* Open actions */}
      {open.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-widest text-[#374151]">Open</h2>
          <div className="space-y-2">
            {open.map((a) => <ActionCard key={a.id} a={a} />)}
          </div>
        </section>
      ) : (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No open actions.
        </div>
      )}

      {/* Closed */}
      {closed.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-widest text-[#374151]">Completed / Cancelled</h2>
          <div className="space-y-2">
            {closed.map((a) => <ActionCard key={a.id} a={a} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
