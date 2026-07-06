import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { getAllFeePaymentHistory } from "@/lib/treasurer-queries";
import { Receipt, CheckCircle2, XCircle } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

const METHOD_STYLES: Record<string, string> = {
  stripe:        "bg-[rgba(20,184,166,0.1)] text-[color:var(--accent)]",
  bank_transfer: "bg-blue-50 text-blue-700",
  cash:          "bg-green-50 text-green-700",
  other:         "bg-[rgba(115,145,176,0.1)] text-[color:var(--muted-foreground)]",
};

const METHOD_LABELS: Record<string, string> = {
  stripe:        "Stripe",
  bank_transfer: "Bank transfer",
  cash:          "Cash",
  other:         "Other",
};

export default async function FeeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; status?: string }>;
}) {
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  const { year: yearFilter, status: statusFilter } = await searchParams;

  const allRows = await getAllFeePaymentHistory();

  // Derive filter options from data
  const availableYears = [...new Set(allRows.map((r) => r.seasonYear))].sort((a, b) => b - a);

  const rows = allRows.filter((r) => {
    if (yearFilter && String(r.seasonYear) !== yearFilter) return false;
    if (statusFilter === "paid" && r.voidedAt) return false;
    if (statusFilter === "voided" && !r.voidedAt) return false;
    return true;
  });

  const totalCollected = rows.filter((r) => !r.voidedAt).reduce((s, r) => s + r.amount, 0);
  const totalVoided = rows.filter((r) => r.voidedAt).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
          <Receipt className="h-5 w-5 text-[color:var(--accent)]" />
        </div>
        <div>
          <h1 className="text-[1.05rem] font-semibold text-slate-800">Fee history</h1>
          <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">All recorded fee payments across every season, including voided entries.</p>
        </div>
      </div>

      {/* Summary + filters */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-6">
            <div>
              <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Collected</p>
              <p className="text-[1.3rem] font-bold text-[color:var(--success)]">{fmt(totalCollected)}</p>
            </div>
            <div>
              <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Voided</p>
              <p className="text-[1.3rem] font-bold text-[color:var(--danger)]">{fmt(totalVoided)}</p>
            </div>
            <div>
              <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Entries</p>
              <p className="text-[1.3rem] font-bold text-slate-800">{rows.length}</p>
            </div>
          </div>

          {/* Filters — use GET form so selects are reflected in the URL */}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <select
              name="year"
              defaultValue={yearFilter ?? ""}
              className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">All seasons</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="voided">Voided</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[rgba(20,184,166,0.1)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)]"
            >
              Filter
            </button>
            {(yearFilter || statusFilter) && (
              <a
                href="/council/fee-history"
                className="rounded-lg px-3 py-1.5 text-[0.78rem] text-[color:var(--muted-foreground)] hover:text-slate-800"
              >
                Clear
              </a>
            )}
          </form>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="council-panel rounded-2xl border p-10 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No payment records found.
        </div>
      ) : (
        <section className="council-panel rounded-2xl border">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_4rem_5rem_6rem_1fr_5.5rem] gap-3 border-b border-[color:var(--border)] px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            <span>Player</span>
            <span>Season</span>
            <span className="text-right">Amount</span>
            <span>Method</span>
            <span>Reference</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-[color:var(--border)]">
            {rows.map((r) => {
              const isVoided = !!r.voidedAt;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1fr_4rem_5rem_6rem_1fr_5.5rem] items-start gap-3 px-5 py-3 text-[0.82rem] ${isVoided ? "bg-red-50/30" : ""}`}
                >
                  {/* Player + date */}
                  <div>
                    <p className={`font-medium ${isVoided ? "text-slate-400 line-through" : "text-slate-800"}`}>
                      {r.playerName}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-[color:var(--muted-foreground)]">
                      {r.paidAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Season year */}
                  <span className={isVoided ? "text-slate-400" : "text-slate-700"}>{r.seasonYear}</span>

                  {/* Amount */}
                  <span className={`text-right font-semibold ${isVoided ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {fmt(r.amount)}
                  </span>

                  {/* Method badge */}
                  <span className={`inline-flex self-start rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${isVoided ? "opacity-40" : ""} ${METHOD_STYLES[r.paymentMethod] ?? METHOD_STYLES.other}`}>
                    {METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}
                  </span>

                  {/* Reference */}
                  <span className={`truncate text-[0.75rem] ${isVoided ? "text-slate-400" : "text-[color:var(--muted-foreground)]"}`}>
                    {r.reference ?? <span className="opacity-40">—</span>}
                  </span>

                  {/* Status */}
                  <div>
                    {isVoided ? (
                      <div>
                        <span className="flex items-center gap-1 text-[0.72rem] font-medium text-[color:var(--danger)]">
                          <XCircle className="h-3 w-3 shrink-0" />
                          Voided
                        </span>
                        {r.voidReason && (
                          <p className="mt-0.5 text-[0.65rem] text-[color:var(--muted-foreground)]">{r.voidReason}</p>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-[0.72rem] font-medium text-[color:var(--success)]">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Paid
                      </span>
                    )}
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
