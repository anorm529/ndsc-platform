import { redirect } from "next/navigation";
import { getCouncilUser } from "@/lib/council-session";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCouncilUser();
  if (user) redirect("/council/dashboard");

  return (
    <main className="council-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(17,114,132,0.14),transparent_28%),linear-gradient(180deg,rgba(2,10,20,0.35)_0%,rgba(2,8,16,0)_20%,rgba(2,8,16,0.55)_100%)]" />

      <section className="council-panel relative z-10 w-full max-w-[52rem] rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto flex max-w-[44rem] flex-col items-center text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent-muted)] ring-1 ring-[color:var(--border-strong)]">
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-[color:var(--accent)]" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>

          <h1 className="text-[2.6rem] font-semibold tracking-[-0.05em] text-white sm:text-[3rem]">
            Council Dashboard
          </h1>
          <p className="mt-3 text-lg text-[color:var(--muted-foreground)] sm:text-[1.05rem]">
            North Down Softball Club
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
