import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import NewsClient from "@/app/news/news-client";
import JsonLd from "@/app/components/JsonLd";
import SiteFooter from "@/app/components/SiteFooter";
import { sanityClient } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import { POSTS_BY_KIND, SITE_SETTINGS } from "@/lib/sanity/queries";
import { absoluteUrl, buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("News"),
  description:
    "Read North Down Softball Club news, softball Bangor updates, and Softball Ulster match reports from Ward Park in Northern Ireland.",
  path: "/news",
});

type PostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  postKind?: string;
  cardImage?: unknown;
  teams?: string[] | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
};

type SiteSettings = {
  clubReportBanner?: unknown;
  matchReportBanner?: unknown;
  buccaneersReportBanner?: unknown;
  barracudasReportBanner?: unknown;
  sluggersReportBanner?: unknown;
  stallionsReportBanner?: unknown;
  nightmaresReportBanner?: unknown;
};

const TEAM_BANNER: Record<string, keyof SiteSettings> = {
  buccaneers: "buccaneersReportBanner",
  barracudas: "barracudasReportBanner",
  sluggers: "sluggersReportBanner",
  stallions: "stallionsReportBanner",
  nightmares: "nightmaresReportBanner",
};

export type PostCardUI = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  postKind?: string;
  cardImageUrl?: string | null;
  teams?: string[] | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
};

function resolveCardImageUrl(
  post: PostCard,
  kind: "clubNews" | "teamReport",
  settings: SiteSettings | null
): string | null {
  if (post.cardImage) return urlFor(post.cardImage).width(800).height(500).url();
  if (kind === "teamReport") {
    const primaryTeam = post.teams?.[0];
    const bannerKey = primaryTeam ? TEAM_BANNER[primaryTeam] : undefined;
    const banner = (bannerKey && settings?.[bannerKey]) ?? settings?.matchReportBanner;
    return banner ? urlFor(banner).width(800).height(500).url() : null;
  }
  return settings?.clubReportBanner
    ? urlFor(settings.clubReportBanner).width(800).height(500).url()
    : null;
}

function toUI(
  rows: PostCard[],
  kind: "clubNews" | "teamReport",
  settings: SiteSettings | null
): PostCardUI[] {
  return rows.map((p) => ({
    _id: p._id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    publishedAt: p.publishedAt,
    postKind: p.postKind,
    cardImageUrl: resolveCardImageUrl(p, kind, settings),
    teams: p.teams ?? null,
    opponent: p.opponent ?? null,
    scoreFor: p.scoreFor ?? null,
    scoreAgainst: p.scoreAgainst ?? null,
  }));
}

export default async function NewsPage() {
  const none = <T,>(): Promise<T> => Promise.resolve(null as T);

  const [clubNewsRaw, teamReportsRaw, siteSettings] = await Promise.all([
    sanityClient
      ? sanityClient.fetch<PostCard[]>(POSTS_BY_KIND, { kind: "clubNews" }, { next: { revalidate } })
      : none<PostCard[]>(),
    sanityClient
      ? sanityClient.fetch<PostCard[]>(POSTS_BY_KIND, { kind: "teamReport" }, { next: { revalidate } })
      : none<PostCard[]>(),
    sanityClient
      ? sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS, {}, { next: { revalidate } })
      : none<SiteSettings | null>(),
  ]);

  const clubNews = toUI(clubNewsRaw ?? [], "clubNews", siteSettings);
  const teamReports = toUI(teamReportsRaw ?? [], "teamReport", siteSettings);

  const allPosts = [...clubNews, ...teamReports]
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 10);

  const newsSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "North Down Softball Club News",
    url: absoluteUrl("/news"),
    description:
      "Club updates and team reports from North Down Softball Club in Bangor, Northern Ireland.",
    blogPost: allPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(`/news/${post.slug}`),
      datePublished: post.publishedAt,
    })),
  };

  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <JsonLd data={newsSchema} />
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <div className="text-xs tracking-[0.25em] font-semibold text-teal-300">
            NEWS
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold">
            News & Reports
          </h1>
          <p className="mt-3 text-white/70 max-w-2xl">
            Club updates, match reports, tournaments and announcements.
          </p>
        </div>

        <div className="mt-10">
          <NewsClient clubNews={clubNews} teamReports={teamReports} />
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
