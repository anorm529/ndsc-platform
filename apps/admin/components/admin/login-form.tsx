"use client";

import { useActionState } from "react";
import { Lock, Mail, Shield } from "lucide-react";
import { authenticateAdmin, type LoginState } from "@/app/admin/login/actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    authenticateAdmin,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-12 w-full max-w-[48rem] space-y-5 sm:mt-14 sm:space-y-6"
    >
      <label className="admin-panel-soft flex h-[4.75rem] items-center gap-4 rounded-[1.75rem] px-6 text-lg text-[color:var(--muted-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:h-20 sm:px-7 sm:text-[1.1rem]">
        <Mail className="h-6 w-6 shrink-0 text-[#8d97a7]" />
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Admin email"
          className="h-full w-full border-0 bg-transparent text-[1.65rem] tracking-[-0.03em] text-white outline-none placeholder:text-[#8691a2] sm:text-[1.15rem]"
          required
        />
      </label>

      <label className="admin-panel-soft flex h-[4.75rem] items-center gap-4 rounded-[1.75rem] px-6 text-lg text-[color:var(--muted-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:h-20 sm:px-7 sm:text-[1.1rem]">
        <Lock className="h-6 w-6 shrink-0 text-[#8d97a7]" />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter admin password"
          className="h-full w-full border-0 bg-transparent text-[1.65rem] tracking-[-0.03em] text-white outline-none placeholder:text-[#8691a2] sm:text-[1.15rem]"
          required
        />
      </label>

      {state.error ? (
        <p className="text-sm text-[color:var(--danger)] sm:text-[0.98rem]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="admin-accent-glow flex h-[4.75rem] w-full items-center justify-center gap-4 rounded-[1.75rem] bg-[linear-gradient(180deg,#3b837d_0%,#31756e_100%)] text-[1.9rem] font-medium tracking-[-0.04em] text-[#04101a] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:h-20 sm:text-[1.2rem]"
      >
        <Shield className="h-6 w-6" />
        {isPending ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
