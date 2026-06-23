import { CheckCircle2 } from "lucide-react";

export default function PaymentConfirmedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(16,185,129,0.2)] bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(16,185,129,0.1)]">
          <CheckCircle2 className="h-8 w-8 text-[color:var(--success)]" />
        </div>
        <h1 className="mb-2 text-[1.25rem] font-bold text-slate-800">Payment received</h1>
        <p className="text-[0.88rem] text-slate-500">
          Thank you — your membership fee payment has been recorded. You can close this page.
        </p>
        <p className="mt-6 text-[0.75rem] text-slate-400">North Down Softball Club</p>
      </div>
    </div>
  );
}
