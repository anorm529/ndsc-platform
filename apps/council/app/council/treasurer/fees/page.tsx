import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, PoundSterling, CheckCircle2 } from "lucide-react";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { getAllFeeSeasons, createFeeSeason } from "@/lib/treasurer-queries";

function fmt(n: number) {
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
    const playerFee = parseFloat(String(formData.get("player_fee") ?? "85"));
    const rookieFee = parseFloat(String(formData.get("rookie_fee") ?? "60"));
    const umpireFee = parseFloat(String(formData.get("umpire_fee") ?? "0"));
    const dueDate = String(formData.get("due_date") ?? "").trim();
    if (!year || !label) return;
    const id = await createFeeSeason({
      year, label, playerFee, rookieFee, umpireFee,
      dueDate: dueDate || undefined,
    });
    redirect(`/council/treasurer/fees/${id}`);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Create season */}
      <section className="council-panel rounded-2xl border p-5">
        <h2 className="mb-4 text-[0.92rem] font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[color:var(--accent)]" />
          New fee season
        </h2>
        <form action={handleCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="year"
              type="number"
              defaultValue={currentYear}
              required
              placeholder="Year"
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
            />
            <input
              name="label"
              required
              placeholder="Label (e.g. 2026 Season)"
              defaultValue={`${currentYear} Season`}
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
            />
          </div>

          {/* Fee rates */}
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Fee rates</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[0.75rem] text-[color:var(--muted-foreground)]">Player fee (£)</span>
              <input
                name="player_fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue="85"
                required
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] text-[color:var(--muted-foreground)]">Rookie fee (£)</span>
              <input
                name="rookie_fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue="60"
                required
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] text-[color:var(--muted-foreground)]">Umpire fee (£)</span>
              <input
                name="umpire_fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                required
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </label>
          </div>

          <input
            name="due_date"
            type="date"
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.88rem] font-medium text-white hover:brightness-105"
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
                <p className="text-[0.92rem] font-medium text-slate-800 group-hover:text-[color:var(--accent)]">
                  {s.label}
                </p>
                <p className="mt-0.5 text-[0.72rem] text-[color:var(--muted-foreground)]">
                  Player {fmt(s.playerFee)} · Rookie {fmt(s.rookieFee)} · Umpire {fmt(s.umpireFee)}
                  {s.dueDate ? ` · Due ${new Date(s.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
              {s.isActive && (
                <span className="shrink-0 flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--success)]">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
