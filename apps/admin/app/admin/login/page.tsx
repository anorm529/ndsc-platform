import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminUser } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const adminUser = await getAdminUser();

  if (adminUser) {
    redirect("/admin/overview");
  }

  return (
    <main className="admin-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(17,114,132,0.16),transparent_28%),linear-gradient(180deg,rgba(2,10,20,0.35)_0%,rgba(2,8,16,0)_20%,rgba(2,8,16,0.55)_100%)]" />

      <section className="admin-panel relative z-10 w-full max-w-[56rem] rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="mx-auto flex max-w-[50rem] flex-col items-center text-center">
          <div className="mb-9 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] sm:h-32 sm:w-32">
            <Image
              src="/logo.png"
              alt="NDSC logo"
              width={128}
              height={128}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <h1 className="text-[2.7rem] font-semibold tracking-[-0.05em] text-white sm:text-[3.45rem]">
            Admin Access
          </h1>
          <p className="mt-3 text-lg text-[color:var(--muted-foreground)] sm:text-[2rem] sm:leading-none">
            North Down Softball Club Control Panel
          </p>

          <LoginForm />

          <div className="mt-14 space-y-3 sm:mt-16">
            <p className="text-[1.7rem] text-[#8c95a5] sm:text-[1.05rem]">
              Protected area. Authorized personnel only.
            </p>
          
          </div>
        </div>
      </section>
    </main>
  );
}
