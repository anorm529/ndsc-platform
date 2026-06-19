"use client";

import { useActionState } from "react";
import { Lock, Mail, Users } from "lucide-react";
import { authenticateCouncil, type LoginState } from "@/app/login/actions";

const initial: LoginState = { error: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(authenticateCouncil, initial);

  return (
    <form action={formAction} className="mt-12 w-full max-w-[44rem] space-y-5 sm:mt-14">
      <label className="council-panel-soft flex h-[4.75rem] items-center gap-4 rounded-[1.75rem] px-6 sm:h-20 sm:px-7">
        <Mail className="h-5 w-5 shrink-0 text-[#8d97a7]" />
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Your email"
          required
          className="h-full w-full border-0 bg-transparent text-[1.55rem] tracking-[-0.03em] text-white outline-none placeholder:text-[#8691a2] sm:text-[1.1rem]"
        />
      </label>

      <label className="council-panel-soft flex h-[4.75rem] items-center gap-4 rounded-[1.75rem] px-6 sm:h-20 sm:px-7">
        <Lock className="h-5 w-5 shrink-0 text-[#8d97a7]" />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          className="h-full w-full border-0 bg-transparent text-[1.55rem] tracking-[-0.03em] text-white outline-none placeholder:text-[#8691a2] sm:text-[1.1rem]"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-[color:var(--danger)]">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="council-accent-glow flex h-[4.75rem] w-full items-center justify-center gap-3 rounded-[1.75rem] bg-[linear-gradient(180deg,#3b837d_0%,#31756e_100%)] text-[1.8rem] font-medium tracking-[-0.04em] text-[#04101a] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:h-20 sm:text-[1.15rem]"
      >
        <Users className="h-5 w-5" />
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
