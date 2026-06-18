import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import SiteFooter from "@/app/components/SiteFooter";
import { SITE_EMAIL, buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Privacy Policy"),
  description:
    "Privacy information for North Down Softball Club, including website analytics, cookies, member access, and contact details.",
  path: "/privacy-policy",
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-white/75">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div>
          <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">
            LEGAL
          </div>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-white/70">
            This page explains what information North Down Softball Club collects
            through this website, how it is used, and who it may be shared with.
          </p>
          <p className="mt-2 text-sm text-white/50">Last updated: 19 March 2026</p>
        </div>

        <div className="mt-10 space-y-6">
          <Section title="Who We Are">
            <p>
              North Down Softball Club operates this website. If you have any
              questions about this notice or how your information is used, you can
              contact us at{" "}
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-teal-300 underline underline-offset-4 hover:text-teal-200"
              >
                {SITE_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="What We Collect">
            <p>We may collect limited information when you use this website, including:</p>
            <p>your browser, device, and page view information through analytics tools;</p>
            <p>technical request data such as IP-derived and usage information handled by our hosting and analytics providers;</p>
            <p>information you choose to send us directly, such as email enquiries or interest form submissions;</p>
            <p>member access status through the site’s members-area authentication cookie.</p>
          </Section>

          <Section title="How We Use Information">
            <p>We use information to:</p>
            <p>run and secure the website;</p>
            <p>understand how the site is used and improve content and performance;</p>
            <p>provide member-only access after a correct PIN is entered;</p>
            <p>respond to enquiries and club-related communications.</p>
          </Section>

          <Section title="Analytics And Third Parties">
            <p>This website currently uses Google Analytics 4 to measure traffic and page usage.</p>
            <p>
              We also use Vercel Analytics and Vercel Speed Insights to understand
              aggregate performance and visit trends.
            </p>
            <p>
              The site includes a Facebook section and loads Facebook SDK content to
              display North Down Softball Club’s Facebook presence.
            </p>
            <p>
              Club news content is managed through Sanity, and some members/club data
              is served from Neon/Postgres and Vercel Blob.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              This site uses cookies and similar technologies. Some are necessary for
              core functionality, such as the members access cookie, while others
              relate to analytics or embedded third-party content.
            </p>
            <p>
              More detail is available on the{" "}
              <Link href="/cookies" className="text-teal-300 underline underline-offset-4 hover:text-teal-200">
                Cookies page
              </Link>
              .
            </p>
          </Section>

          <Section title="Sharing">
            <p>
              Depending on how you use the site, information may be processed by
              service providers including Vercel, Google, Meta/Facebook, Sanity, and
              Neon.
            </p>
            <p>
              We do not sell personal information. We only use service providers that
              help us run the site and club services.
            </p>
          </Section>

          <Section title="Retention">
            <p>
              We keep information only for as long as it is needed for the purpose it
              was collected, or as long as required for security, administration, or
              record-keeping.
            </p>
            <p>
              Analytics retention and processing periods may also depend on the
              settings and policies of the relevant provider.
            </p>
          </Section>

          <Section title="Your Rights">
            <p>
              If UK GDPR applies to your information, you may have rights to access,
              correct, erase, restrict, or object to certain processing, and in some
              cases request data portability.
            </p>
            <p>
              You may also complain to the UK Information Commissioner’s Office if
              you believe your information has been handled improperly.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For privacy-related questions, contact{" "}
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-teal-300 underline underline-offset-4 hover:text-teal-200"
              >
                {SITE_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
