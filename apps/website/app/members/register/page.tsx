import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "@/app/members/register/register-form";

export default async function MembersRegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/members/home");

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_440px]">
        <div>
          <div className="inline-flex rounded-full border border-teal-300/35 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-400">
            Create member account
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Link yourself to the NDSC player record.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            If your player record already exists, we link it. If not, the platform creates
            one automatically and connects your account to it.
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-semibold">Register</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use the same name you use in club stats where possible.
          </p>
          <RegisterForm />
          <div className="mt-5 border-t border-[#2B4162] pt-5 text-sm text-slate-300">
            Already registered?{" "}
            <Link href="/members" className="font-semibold text-teal-400 hover:text-teal-300">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
