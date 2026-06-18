import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import NewsClient from "@/app/news/news-client";
import JsonLd from "@/app/components/JsonLd";
import SiteFooter from "@/app/components/SiteFooter";
import { sanityClient } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import { POSTS_BY_KIND } from "@/lib/sanity/queries";
import { absoluteUrl, buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const revalidate = 300; // refresh every 5 mins (matches your standings pattern) //export const revalidate = 300;

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
  coverImage?: unknown;
  teams?: string[] | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
};

type PostCardUI = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  postKind?: string;
  coverImageUrl?: string | null;
  teams?: string[] | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
};

async function getPosts(kind: "clubNews" | "teamReport"): Promise<PostCardUI[]> {
  if (!sanityClient) return [];

  const rows = await sanityClient.fetch<PostCard[]>(
    POSTS_BY_KIND,
    { kind },
    // Ensure Next uses ISR revalidate for this fetch too
    { next: { revalidate } }
  );

  return rows.map((p) => ({
    _id: p._id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    publishedAt: p.publishedAt,
    postKind: p.postKind,
    coverImageUrl: p.coverImage ? urlFor(p.coverImage).width(800).height(500).url() : null,
    teams: p.teams ?? null,
    opponent: p.opponent ?? null,
    scoreFor: p.scoreFor ?? null,
    scoreAgainst: p.scoreAgainst ?? null,
  }));
}

export default async function NewsPage() {
  const [clubNews, teamReports] = await Promise.all([
    getPosts("clubNews"),
    getPosts("teamReport"),
  ]);

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
