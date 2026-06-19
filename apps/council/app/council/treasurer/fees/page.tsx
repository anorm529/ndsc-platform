import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, PoundSterling, CheckCircle2, AlertCircle } from "lucide-react";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { getAllFeeSeasons, createFeeSeason } from "@/lib/treasurer-queries";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default async function FeesSeasonsPage() {
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  const seasons = await getAllFeeSeasons();

  async function handleCreate(formData: FormData) {
    "use server";
    const year = parseInt(String(formData.get("year") ?? ""), 10);
    const label = String(formData.get("label") ?? "").trim();
    const standardFee = parseFloat(String(formData.get("standard_fee") ?? "0"));
    const dueDate = String(formData.get("due_date") ?? "").trim();
    if (!year || !label) return;
    const id = await createFeeSeason({ year, label, standardFee, dueDate: dueDate || undefined });
    redirect(`/council/treasurer/fees/${id}`);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Create season */}
      <section className="council-panel rounded-2xl border p-5">
        <h2 className="mb-4 text-[0.92rem] font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-[color:var(--accent)]" />
          New fee season
        </h2>
        <form action={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <input
            name="year"
            type="number"
            defaultValue={currentYear}
            required
            placeholder="Year"
            className="rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2.5 text-[0.85rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)]"
          />
          <input
            name="label"
            required
            placeholder="Label (e.g. 2026 Season)"
            defaultValue={`${currentYear} Season`}
            className="rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2.5 text-[0.85rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)]"
          />
          <input
            name="standard_fee"
            type="number"
            step="0.01"
            min="0"
            placeholder="Standard fee (£)"
            className="rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2.5 text-[0.85rem] text-white outline-none placeholder:text-[#4a5568] focus:border-[color:var(--border-strong)]"
          />
          <input
            name="due_date"
            type="date"
            className="rounded-xl border border-[color:var(--border)] bg-[rgba(10,24,41,0.6)] px-3 py-2.5 text-[0.85rem] text-white outline-none focus:border-[color:var(--border-strong)]"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-xl bg-[linear-gradient(180deg,#3b837d_0%,#31756e_100%)] py-2.5 text-[0.88rem] font-medium text-[#04101a] hover:brightness-105"
          >
            Create season
          </button>
        </form>
      </section>

      {/* Season list */}
      {seasons.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No fee seasons yet.
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/council/treasurer/fees/${s.id}`}
              className="council-panel group flex items-center gap-4 rounded-2xl border p-5 hover:border-[color:var(--border-strong)] hover:bg-[rgba(29,215,207,0.02)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-muted)]">
                <PoundSterling className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] font-medium text-white group-hover:text-[color:var(--accent)]">
                  {s.label}
                </p>
                <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">
                  Standard fee: {fmtCurrency(s.standardFee)}
                  {s.dueDate ? ` · Due ${new Date(s.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
              {s.isActive ? (
                <span className="shrink-0 flex items-center gap-1 rounded-full bg-[rgba(24,213,141,0.12)] px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--success)]">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
