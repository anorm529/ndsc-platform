import Link from "next/link";
import { Plus, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { getAllAccounts } from "@/lib/treasurer-queries";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default async function AccountsPage() {
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  const accounts = await getAllAccounts();
  const totalBalance = accounts.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header + total */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">Total across all accounts</p>
          <p className={[
            "text-[2.2rem] font-bold tracking-[-0.04em]",
            totalBalance >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]",
          ].join(" ")}>
            {fmtCurrency(totalBalance)}
          </p>
        </div>
        <Link
          href="/council/treasurer/accounts/new"
          className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-muted)] px-4 py-2.5 text-[0.85rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.2)]"
        >
          <Plus className="h-4 w-4" />
          New account
        </Link>
      </div>

      {/* Account cards */}
      {accounts.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No accounts yet. Create one to start tracking income and expenses.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              href={`/council/treasurer/accounts/${acc.id}`}
              className="council-panel group flex items-center gap-4 rounded-2xl border p-5 hover:border-[color:var(--border-strong)] hover:bg-[rgba(29,215,207,0.02)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-muted)]">
                <Wallet className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.92rem] font-medium text-slate-800 group-hover:text-[color:var(--accent)]">
                  {acc.name}
                </p>
                {acc.description ? (
                  <p className="truncate text-[0.75rem] text-[color:var(--muted-foreground)]">
                    {acc.description}
                  </p>
                ) : null}
                {!acc.isActive ? (
                  <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">Inactive</span>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className={[
                  "text-[1.1rem] font-bold tracking-[-0.03em]",
                  acc.balance >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]",
                ].join(" ")}>
                  {fmtCurrency(acc.balance)}
                </p>
                {acc.balance >= 0 ? (
                  <TrendingUp className="ml-auto h-3 w-3 text-[color:var(--success)]" />
                ) : (
                  <TrendingDown className="ml-auto h-3 w-3 text-[color:var(--danger)]" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
