import Link from "next/link";
import ResendVerificationForm from "./resend-verification-form";

export default function PendingAccountPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-6 text-white">
      <section className="w-full max-w-lg space-y-4">
        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-300 text-xl font-bold text-[#0F172A]">
            ND
          </div>
          <h1 className="mt-6 text-3xl font-semibold">Account awaiting approval</h1>
          <p className="mt-3 text-slate-300">
            Your member account has been created. Please check your email for a verification
            link, then an admin will approve your account before you can access the members
            area.
          </p>
          <Link
            href="/members"
            className="mt-6 inline-flex rounded-xl bg-teal-300 px-5 py-3 text-sm font-semibold text-[#0F172A]"
          >
            Back to sign in
          </Link>
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
          <h2 className="text-sm font-semibold text-slate-200">Didn&apos;t receive the verification email?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Check your spam folder first. If it&apos;s not there, enter your email below to get a
            new link. Links expire after 24 hours.
          </p>
          <ResendVerificationForm />
        </div>
      </section>
    </main>
  );
}
