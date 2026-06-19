import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Plus, Clock } from "lucide-react";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import {
  getFeeSeasonById,
  getPlayerFeesForSeason,
  upsertPlayerFee,
  recordFeePayment,
} from "@/lib/treasurer-queries";
import { getAllActiveMembers, memberDisplayName } from "@/lib/main-db";
import { getAllTeams } from "@/lib/team-queries";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default async function SeasonFeesPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  const [season, playerFees, members, teams] = await Promise.all([
    getFeeSeasonById(seasonId),
    getPlayerFeesForSeason(seasonId),
    getAllActiveMembers(),
    getAllTeams(),
  ]);

  if (!season) notFound();

  const totalDue = playerFees.reduce((s, f) => s + f.amountDue, 0);
  const totalPaid = playerFees.reduce((s, f) => s + f.amountPaid, 0);
  const paidCount = playerFees.filter((f) => f.amountPaid >= f.amountDue).length;

  // Members not yet added to this season
  const existingUserIds = new Set(playerFees.map((f) => f.userId));
  const unenrolled = members.filter((m) => !existingUserIds.has(m.id));

  async function handleAddPlayer(formData: FormData) {
    "use server";
    await requireCouncilUser();
    const userId = String(formData.get("userId") ?? "");
    const amountDue = parseFloat(String(formData.get("amountDue") ?? "0"));
    const teamId = String(formData.get("teamId") ?? "").trim() || undefined;
    const member = members.find((m) => m.id === userId);
    if (!userId || !member) return;
    await upsertPlayerFee({
      userId,
      playerName: memberDisplayName(member),
      teamId,
      seasonId,
      amountDue,
    });
    redirect(`/council/treasurer/fees/${seasonId}`);
  }

  async function handleRecordPayment(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const playerFeeId = String(formData.get("playerFeeId") ?? "");
    const amount = parseFloat(String(formData.get("amount") ?? "0"));
    const paymentMethod = String(formData.get("paymentMethod") ?? "bank_transfer");
    const reference = String(formData.get("reference") ?? "").trim();
    if (!playerFeeId || !amount) return;
    await recordFeePayment({
      playerFeeId,
      amount,
      paymentMethod,
      paidAt: new Date().toISOString(),
      reference: reference || undefined,
      recordedBy: u.id,
    });
    redirect(`/council/treasurer/fees/${seasonId}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/council/treasurer/fees" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Fee seasons
      </Link>

      {/* Season summary */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold text-slate-800">{season.label}</h2>
            {season.dueDate ? (
              <p className="mt-1 text-[0.78rem] text-[color:var(--muted-foreground)]">
                Due: {new Date(season.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            ) : null}
          </div>
          {season.isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-1 text-[0.7rem] text-[color:var(--success)]">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Collected</p>
            <p className="text-[1.3rem] font-bold text-[color:var(--success)]">{fmtCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Outstanding</p>
            <p className={["text-[1.3rem] font-bold", totalDue - totalPaid > 0 ? "text-[color:var(--warning)]" : "text-[color:var(--success)]"].join(" ")}>
              {fmtCurrency(Math.max(0, totalDue - totalPaid))}
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Paid</p>
            <p className="text-[1.3rem] font-bold text-slate-800">
              {paidCount}/{playerFees.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {playerFees.length > 0 ? (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.15)]">
            <div
              className="h-full rounded-full bg-[color:var(--success)]"
              style={{ width: `${Math.min(100, (totalPaid / totalDue) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Add player */}
      {unenrolled.length > 0 ? (
        <section className="council-panel rounded-2xl border p-5">
          <h3 className="mb-3 text-[0.88rem] font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[color:var(--accent)]" />
            Add player to season
          </h3>
          <form action={handleAddPlayer} className="grid gap-3 sm:grid-cols-3">
            <select
              name="userId"
              required
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">Select member…</option>
              {unenrolled.map((m) => (
                <option key={m.id} value={m.id}>{memberDisplayName(m)}</option>
              ))}
            </select>
            <input
              name="amountDue"
              type="number"
              step="0.01"
              min="0"
              defaultValue={season.standardFee}
              required
              placeholder="Amount due (£)"
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
            />
            <select
              name="teamId"
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.seasonYear})</option>
              ))}
            </select>
            <button
              type="submit"
              className="sm:col-span-3 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.85rem] font-medium text-white hover:brightness-105"
            >
              Add player
            </button>
          </form>
        </section>
      ) : null}

      {/* Player fee rows */}
      {playerFees.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No players added to this season yet.
        </div>
      ) : (
        <section className="council-panel rounded-2xl border p-5">
          <h3 className="mb-4 text-[0.88rem] font-semibold text-slate-800">Player fees</h3>
          <div className="space-y-3">
            {playerFees.map((pf) => {
              const remaining = pf.amountDue - pf.amountPaid;
              const fullyPaid = remaining <= 0;
              const overdue = !fullyPaid && season.dueDate && new Date(season.dueDate) < new Date();

              return (
                <div key={pf.id} className={[
                  "rounded-xl border p-4",
                  fullyPaid
                    ? "border-[rgba(24,213,141,0.15)] bg-[rgba(22,135,91,0.06)]"
                    : overdue
                    ? "border-[rgba(239,75,95,0.2)] bg-[rgba(125,22,38,0.06)]"
                    : "border-[color:var(--border)] bg-slate-50/50",
                ].join(" ")}>
                  <div className="flex items-start gap-3">
                    {fullyPaid ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                    ) : overdue ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--danger)]" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[0.88rem] font-medium text-slate-800">{pf.playerName}</p>
                        <p className={[
                          "shrink-0 text-[0.92rem] font-bold",
                          fullyPaid ? "text-[color:var(--success)]" : "text-[color:var(--warning)]",
                        ].join(" ")}>
                          {fmtCurrency(pf.amountPaid)} / {fmtCurrency(pf.amountDue)}
                        </p>
                      </div>
                      {pf.teamName ? (
                        <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">{pf.teamName}</p>
                      ) : null}

                      {/* Record payment form */}
                      {!fullyPaid ? (
                        <form action={handleRecordPayment} className="mt-3 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="playerFeeId" value={pf.id} />
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            defaultValue={remaining > 0 ? remaining.toFixed(2) : ""}
                            placeholder="Amount"
                            required
                            className="w-24 rounded-lg border border-[color:var(--border)] bg-slate-100 px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
                          />
                          <select
                            name="paymentMethod"
                            className="rounded-lg border border-[color:var(--border)] bg-slate-100 px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none"
                          >
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            name="reference"
                            placeholder="Ref"
                            className="w-24 rounded-lg border border-[color:var(--border)] bg-slate-100 px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-[rgba(29,215,207,0.14)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(29,215,207,0.22)]"
                          >
                            Record payment
                          </button>
                        </form>
                      ) : null}

                      {/* Payment history */}
                      {pf.amountPaid > 0 ? (
                        <p className="mt-1 text-[0.7rem] text-[color:var(--muted-foreground)]">
                          {fmtCurrency(pf.amountPaid)} paid · {fmtCurrency(Math.max(0, remaining))} remaining
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
