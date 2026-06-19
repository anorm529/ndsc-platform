import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { requireCouncilUser, requireTreasurerAccess } from "@/lib/council-session";
import { getAccountById, getAccountTransactions, addTransaction, deleteTransaction } from "@/lib/treasurer-queries";

const CATEGORIES = ["fees", "kit", "field_hire", "equipment", "social", "sponsorship", "other"];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCouncilUser();
  await requireTreasurerAccess(user);

  const [account, transactions] = await Promise.all([
    getAccountById(id),
    getAccountTransactions(id),
  ]);

  if (!account) notFound();

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  async function handleAddTransaction(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    const type = String(formData.get("type") ?? "") as "income" | "expense";
    const amount = parseFloat(String(formData.get("amount") ?? "0"));
    const description = String(formData.get("description") ?? "").trim();
    const date = String(formData.get("date") ?? "");
    const category = String(formData.get("category") ?? "other");
    const reference = String(formData.get("reference") ?? "").trim();

    if (!type || !amount || !description || !date) return;

    await addTransaction({
      accountId: id,
      type,
      category,
      amount,
      description,
      date,
      reference: reference || undefined,
      recordedBy: u.id,
    });
    redirect(`/council/treasurer/accounts/${id}`);
  }

  async function handleDeleteTransaction(formData: FormData) {
    "use server";
    await requireCouncilUser();
    const txId = String(formData.get("txId") ?? "");
    if (txId) await deleteTransaction(txId);
    redirect(`/council/treasurer/accounts/${id}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/council/treasurer/accounts" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Accounts
      </Link>

      {/* Account header */}
      <div className="council-panel rounded-2xl border p-5">
        <h2 className="text-[1.1rem] font-semibold text-slate-800">{account.name}</h2>
        {account.description ? (
          <p className="mt-1 text-[0.82rem] text-[color:var(--muted-foreground)]">{account.description}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Balance</p>
            <p className={["text-[1.4rem] font-bold tracking-[-0.03em]", account.balance >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"].join(" ")}>
              {fmtCurrency(account.balance)}
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Total income</p>
            <p className="text-[1.1rem] font-semibold text-[color:var(--success)]">{fmtCurrency(income)}</p>
          </div>
          <div>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">Total expenses</p>
            <p className="text-[1.1rem] font-semibold text-[color:var(--danger)]">{fmtCurrency(expenses)}</p>
          </div>
        </div>
      </div>

      {/* Add transaction form */}
      <section className="council-panel rounded-2xl border p-5">
        <h3 className="mb-4 flex items-center gap-2 text-[0.88rem] font-semibold text-slate-800">
          <Plus className="h-4 w-4 text-[color:var(--accent)]" />
          Add transaction
        </h3>
        <form action={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select
              name="type"
              required
              className="col-span-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)] sm:col-span-1"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Amount (£)"
              className="col-span-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)] sm:col-span-1"
            />
            <select
              name="category"
              className="col-span-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)] sm:col-span-1"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="col-span-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)] sm:col-span-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="description"
              required
              placeholder="Description *"
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
            />
            <input
              name="reference"
              placeholder="Reference (invoice/receipt)"
              className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[color:var(--border-strong)]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.85rem] font-medium text-white hover:brightness-105"
          >
            Add transaction
          </button>
        </form>
      </section>

      {/* Transaction history */}
      <section className="council-panel rounded-2xl border p-5">
        <h3 className="mb-4 text-[0.88rem] font-semibold text-slate-800">
          Transaction history ({transactions.length})
        </h3>

        {transactions.length === 0 ? (
          <p className="text-[0.85rem] text-[color:var(--muted-foreground)]">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                {tx.type === "income" ? (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-[color:var(--danger)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem] font-medium text-slate-800">{tx.description}</p>
                  <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                    {fmtDate(tx.date)} · {tx.category.replace(/_/g, " ")}
                    {tx.reference ? ` · ${tx.reference}` : ""}
                  </p>
                </div>
                <p className={[
                  "shrink-0 text-[0.95rem] font-semibold",
                  tx.type === "income" ? "text-[color:var(--success)]" : "text-[color:var(--danger)]",
                ].join(" ")}>
                  {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
                </p>
                <form action={handleDeleteTransaction}>
                  <input type="hidden" name="txId" value={tx.id} />
                  <button
                    type="submit"
                    className="rounded-lg p-1.5 text-[#374151] hover:bg-[rgba(239,75,95,0.1)] hover:text-[color:var(--danger)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
