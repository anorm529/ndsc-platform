import Link from "next/link";
import ForgotPasswordForm from "@/app/members/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your account email and we will create a secure reset link.
        </p>
        <ForgotPasswordForm />
        <Link href="/members" className="mt-5 inline-flex text-sm font-semibold text-teal-400">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
