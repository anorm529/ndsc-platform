import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import SiteFooter from "@/app/components/SiteFooter";
import { primaryNavLinks } from "@/lib/site-nav";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <Navbar />

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-6 py-32 text-center">
        <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">404</div>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Page not found</h1>
        <p className="mt-4 max-w-md text-white/60">
          We couldn&apos;t find what you were looking for. It may have moved or never existed.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-2xl bg-teal-300 px-6 py-3 text-sm font-semibold text-[#0B1324] transition hover:bg-teal-200"
          >
            Back to home
          </Link>
          <Link
            href="/news"
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Club news
          </Link>
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
