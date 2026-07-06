import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

import { ConfirmEmailForm } from "./confirm-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; token?: string }>;
}) {
  const params = await searchParams;
  const token = params?.token;
  const success = params?.status === "success";

  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-8 text-center">
        {token ? (
          <ConfirmEmailForm token={token} />
        ) : success ? (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-teal-400" />
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="mt-3 text-sm text-slate-400">
              Your email address has been confirmed. Your account is pending approval — you will
              be able to sign in once an admin approves your registration.
            </p>
            <Link
              href="/members"
              className="mt-6 inline-flex items-center text-sm font-semibold text-teal-400 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
            <h1 className="text-2xl font-semibold">Link invalid or expired</h1>
            <p className="mt-3 text-sm text-slate-400">
              This verification link has already been used, has expired, or is invalid. Links
              expire after 24 hours. If you need a new link, please contact an admin.
            </p>
            <Link
              href="/members"
              className="mt-6 inline-flex items-center text-sm font-semibold text-teal-400 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
