import { redirect } from "next/navigation";
import { UserCheck, UserX, Link2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getPendingAccounts } from "@/lib/account-queries";
import { AccountActions } from "./account-actions";
import { ResendVerificationButton } from "./resend-verification-button";

const ELEVATED = new Set(["chairman", "vice_chair"]);

export default async function AccountsPage() {
  const user = await requireCouncilUser();
  const isElevated = user.isOwner || [...user.councilPermissions].some((p) => ELEVATED.has(p));
  if (!isElevated) redirect("/council/dashboard");

  const pending = await getPendingAccounts();

  const verified = pending.filter((a) => a.emailVerified);
  const unverified = pending.filter((a) => !a.emailVerified);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-slate-800">Account approvals</h2>
          <p className="mt-0.5 text-[0.8rem] text-[color:var(--muted-foreground)]">
            Review and approve pending member accounts
          </p>
        </div>
        <span className="rounded-full bg-[rgba(233,185,62,0.12)] px-3 py-1 text-[0.75rem] font-medium text-[color:var(--warning)]">
          {pending.length} pending
        </span>
      </div>

      {pending.length === 0 && (
        <div className="council-panel rounded-2xl border p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[color:var(--success)] opacity-60" />
          <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">No pending accounts — you&apos;re all caught up.</p>
        </div>
      )}

      {/* Verified — ready to approve */}
      {verified.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
            <h3 className="text-[0.88rem] font-semibold text-slate-800">
              Email verified — ready to approve ({verified.length})
            </h3>
          </div>
          <div className="space-y-4">
            {verified.map((account) => (
              <div key={account.id} className="rounded-xl border border-[color:var(--border)] p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-medium text-slate-800 truncate">
                      {account.registrationName ?? account.email.split("@")[0]}
                    </p>
                    <p className="text-[0.75rem] text-[color:var(--muted-foreground)] truncate">{account.email}</p>
                    <p className="mt-1 text-[0.7rem] text-[color:var(--muted-foreground)]">
                      Registered {account.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {account.playerId ? (
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(20,184,166,0.1)] px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--accent)]">
                        <Link2 className="h-3 w-3" />
                        {account.playerName}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[rgba(233,185,62,0.1)] px-2.5 py-1 text-[0.7rem] text-[color:var(--warning)]">
                        Not linked
                      </span>
                    )}
                  </div>
                </div>

                {/* Player link suggestions */}
                {!account.playerId && account.suggestions.length > 0 && (
                  <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                    <p className="mb-2 text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">
                      Suggested player matches
                    </p>
                    <AccountActions
                      account={account}
                      mode="link-then-approve"
                    />
                  </div>
                )}

                {/* Approve / deny without linking */}
                {(account.playerId || account.suggestions.length === 0) && (
                  <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                    <AccountActions account={account} mode="approve-deny" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unverified — waiting for email confirmation */}
      {unverified.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h3 className="text-[0.88rem] font-semibold text-slate-800">
              Awaiting email verification ({unverified.length})
            </h3>
          </div>
          <div className="space-y-2">
            {unverified.map((account) => (
              <div key={account.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-slate-50/50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-medium text-slate-700 truncate">
                    {account.registrationName ?? account.email.split("@")[0]}
                  </p>
                  <p className="text-[0.72rem] text-[color:var(--muted-foreground)] truncate">{account.email}</p>
                </div>
                <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">
                  {account.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <ResendVerificationButton userId={account.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
