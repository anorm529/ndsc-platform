import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import SiteFooter from "@/app/components/SiteFooter";
import { buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Cookies"),
  description:
    "Cookie information for North Down Softball Club, including necessary cookies, analytics cookies, and embedded third-party content.",
  path: "/cookies",
});

function Cell({
  children,
  head = false,
}: {
  children: React.ReactNode;
  head?: boolean;
}) {
  const Tag = head ? "th" : "td";
  return (
    <Tag className="border-b border-white/10 px-4 py-3 text-left align-top text-sm text-white/75">
      {children}
    </Tag>
  );
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div>
          <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">
            LEGAL
          </div>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Cookies</h1>
          <p className="mt-4 max-w-3xl text-white/70">
            This page explains how North Down Softball Club uses cookies and
            similar technologies on this website.
          </p>
          <p className="mt-2 text-sm text-white/50">Last updated: 19 March 2026</p>
        </div>

        <div className="mt-10 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">How We Use Cookies</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-white/75">
              <p>
                Cookies are small text files stored on your device when you visit a
                website. They help websites remember useful information about your
                visit.
              </p>
              <p>
                We use cookies and similar tools to keep parts of the site working,
                support the members area, understand general website usage, and show
                embedded content such as our Facebook section.
              </p>
              <p>
                Some cookies are needed for core website features. Others may be
                used for analytics or third-party content.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Types Of Cookies We Use</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-white/75">
              <p>
                <span className="font-semibold text-white">Necessary cookies</span>
                {" "}
                help important parts of the website work properly. For example, they
                can remember when a member has successfully accessed the members area.
              </p>
              <p>
                <span className="font-semibold text-white">Analytics cookies</span>
                {" "}
                help us understand how visitors use the website, such as which pages
                are visited most often.
              </p>
              <p>
                <span className="font-semibold text-white">Third-party content</span>
                {" "}
                may load services from other platforms, such as Facebook, which may
                use their own cookies or similar technologies.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <Cell head>Cookie / Service</Cell>
                  <Cell head>Type</Cell>
                  <Cell head>What it does</Cell>
                  <Cell head>Why we use it</Cell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Cell>`ndsc_members_authed`</Cell>
                  <Cell>Necessary</Cell>
                  <Cell>Remembers that a visitor has successfully unlocked the members area.</Cell>
                  <Cell>So members do not need to re-enter the PIN on every page visit.</Cell>
                </tr>
                <tr>
                  <Cell>Google Analytics 4</Cell>
                  <Cell>Analytics</Cell>
                  <Cell>Helps us understand page visits and general website usage.</Cell>
                  <Cell>To improve the site, content, and visitor experience.</Cell>
                </tr>
                <tr>
                  <Cell>Vercel Analytics / Speed Insights</Cell>
                  <Cell>Analytics / performance</Cell>
                  <Cell>Provides website traffic and performance information in aggregate form.</Cell>
                  <Cell>To help us monitor and improve site speed and reliability.</Cell>
                </tr>
                <tr>
                  <Cell>Facebook SDK / embedded content</Cell>
                  <Cell>Third-party content</Cell>
                  <Cell>Allows Facebook content from North Down Softball Club to appear on the website.</Cell>
                  <Cell>So visitors can see our latest club updates and social content.</Cell>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Managing Cookies</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-white/75">
              <p>
                You can control cookies through your browser settings. Most browsers
                allow you to view, block, or delete cookies at any time.
              </p>
              <p>
                If you choose to block some cookies, parts of the website such as
                analytics features or embedded third-party content may not work in
                the same way.
              </p>
              <p>
                If you have any questions about how we use cookies, please contact
                us at{" "}
                <a
                  href="mailto:northdownsoftballclub@gmail.com"
                  className="text-teal-300 underline underline-offset-4 hover:text-teal-200"
                >
                  northdownsoftballclub@gmail.com
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
