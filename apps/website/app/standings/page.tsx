import type { Metadata } from "next";
import Link from "next/link";
import StandingsClient from "@/app/standings/standings-client";
import Navbar from "@/app/components/Navbar";
import JsonLd from "@/app/components/JsonLd";
import SiteFooter from "@/app/components/SiteFooter";
import { getLeagueStandingsData, type LeagueRow } from "@/lib/ndsc-data";
import { absoluteUrl, buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const revalidate = 300; // refresh every 5 mins
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Standings"),
  description:
    "Softball Ulster fixtures, results, and Division A and Division B standings for North Down Softball Club and other softball Northern Ireland teams.",
  path: "/standings",
});

export default async function StandingsPage() {
  const rows: LeagueRow[] = await getLeagueStandingsData();
  const standingsSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "Softball Ulster Division A and Division B standings - 2025 season",
    sport: "Softball",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Northern Ireland",
    },
    organizer: {
      "@type": "SportsOrganization",
      name: "Softball Ulster",
      url: "https://softballulster.com/",
    },
    subjectOf: {
      "@type": "WebPage",
      name: "North Down Softball Club standings",
      url: absoluteUrl("/standings"),
    },
    description:
      "League table for Softball Ulster Division A and Division B, including North Down Softball Club teams in the 2025 season.",
  };

  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <JsonLd data={standingsSchema} />
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <div className="text-xs tracking-[0.25em] font-semibold text-teal-300">
            LEAGUE
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold">
            Standings
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Track Softball Ulster Division A and Division B fixtures, results, and
            standings, then head to the{" "}
            <Link href="/news" className="text-teal-300 hover:text-teal-200">news page</Link>{" "}
            for North Down Softball Club match reports and club updates.
          </p>
        </div>

        <div className="mt-10">
          <StandingsClient rows={rows} />
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
