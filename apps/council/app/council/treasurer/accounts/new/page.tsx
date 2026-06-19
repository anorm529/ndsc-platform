import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { createAccount } from "@/lib/treasurer-queries";

export default async function NewAccountPage() {
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  async function handleCreate(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) return;
    const id = await createAccount({ name, description: description || undefined, recordedBy: u.id });
    redirect(`/council/treasurer/accounts/${id}`);
  }

  return (
    <div className="max-w-lg">
      <form action={handleCreate} className="council-panel rounded-2xl border p-6 space-y-5">
        <h2 className="text-[0.95rem] font-semibold text-slate-800">Create account</h2>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Account name *</span>
          <input
            name="name"
            required
            placeholder="e.g. Main account, Kit fund"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.8rem] font-medium text-[color:var(--muted-foreground)]">Description</span>
          <textarea
            name="description"
            rows={2}
            placeholder="Optional notes"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)] resize-none"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-3 text-[0.9rem] font-medium text-white hover:brightness-105"
          >
            Create account
          </button>
          <Link
            href="/council/treasurer/accounts"
            className="rounded-xl border border-[color:var(--border)] px-5 py-3 text-[0.9rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
