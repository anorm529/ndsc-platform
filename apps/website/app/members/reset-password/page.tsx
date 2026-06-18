import Link from "next/link";
import ResetPasswordForm from "@/app/members/reset-password/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const token = (await searchParams)?.token ?? "";

  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-400">Reset links expire after one hour.</p>
        <ResetPasswordForm token={token} />
        <Link href="/members" className="mt-5 inline-flex text-sm font-semibold text-teal-400">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
