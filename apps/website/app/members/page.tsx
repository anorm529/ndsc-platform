import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/app/members/login-form";

export default async function MembersLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/members/home");

  const verified = (await searchParams)?.verified;

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="inline-flex rounded-full border border-teal-300/35 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-400">
            NDSC Members Platform
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Your player profile, team hub, awards, stats and season story.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Sign in to see your dashboard, linked player record, current team, fixtures,
            achievements, awards and career analytics.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
            {["Profile", "My Team", "This Week", "Achievements", "Awards"].map((item) => (
              <span key={item} className="rounded-full border border-[#2B4162] bg-slate-700/40 px-4 py-2">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use your member account. The old shared PIN has been retired.
          </p>
          {verified === "1" && (
            <div className="mt-4 rounded-xl border border-teal-300/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-300">
              Email verified — you can sign in now.
            </div>
          )}
          {verified === "invalid" && (
            <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              That verification link is invalid or has already been used. Request a new one from the council.
            </div>
          )}
          <LoginForm />
          <Link href="/members/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-teal-400">
            Forgot password?
          </Link>
          <div className="mt-5 border-t border-[#2B4162] pt-5 text-sm text-slate-300">
            New to the platform?{" "}
            <Link href="/members/register" className="font-semibold text-teal-400 hover:text-teal-300">
              Create your account
            </Link>
          </div>
          <Link
            href="/"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to website
          </Link>
        </div>
      </section>
    </main>
  );
}
