"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2, MailCheck, XCircle } from "lucide-react";

type ConfirmState = "idle" | "working" | "success" | "error";

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<ConfirmState>("idle");

  async function confirm() {
    setState("working");
    try {
      const res = await fetch("/api/members/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <>
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-teal-400" />
        <h1 className="text-2xl font-semibold">Email verified</h1>
        <p className="mt-3 text-sm text-slate-400">
          Your email address has been confirmed. Your account is pending approval — you will be
          able to sign in once an admin approves your registration.
        </p>
        <Link
          href="/members"
          className="mt-6 inline-flex items-center text-sm font-semibold text-teal-400 hover:underline"
        >
          Back to sign in
        </Link>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <XCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
        <h1 className="text-2xl font-semibold">Link invalid or expired</h1>
        <p className="mt-3 text-sm text-slate-400">
          This verification link has already been used, has expired, or is invalid. Links expire
          after 24 hours. You can request a new one below.
        </p>
        <Link
          href="/members/pending"
          className="mt-6 inline-flex items-center text-sm font-semibold text-teal-400 hover:underline"
        >
          Request a new verification email
        </Link>
      </>
    );
  }

  return (
    <>
      <MailCheck className="mx-auto mb-4 h-12 w-12 text-teal-400" />
      <h1 className="text-2xl font-semibold">Confirm your email</h1>
      <p className="mt-3 text-sm text-slate-400">
        Press the button below to verify your email address for your NDSC member account.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={state === "working"}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {state === "working" ? "Verifying..." : "Verify my email"}
      </button>
    </>
  );
}
