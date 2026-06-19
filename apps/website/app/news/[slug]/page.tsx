import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { PortableTextBlock } from "@portabletext/types";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import JsonLd from "@/app/components/JsonLd";
import SiteFooter from "@/app/components/SiteFooter";
import { sanityClient } from "@/lib/sanity/client";
import { POST_BY_SLUG } from "@/lib/sanity/queries";
import { urlFor } from "@/lib/sanity/image";
import { PortableText } from "@portabletext/react";
import {
  SITE_NAME,
  absoluteUrl,
  buildMetadata,
  buildPageTitle,
} from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

export const revalidate = 300;

type Mvp = {
  name?: string;
  category?: "female" | "male";
  runs?: number | null;
  rbis?: number | null;
  outs?: number | null;
};

type Post = {
  _updatedAt?: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  postKind?: "clubNews" | "teamReport";
  teams?: string[] | null;
  teamDisplay?: string | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
  venue?: string | null;
  mvps?: Mvp[] | null;
  debutants?: string[] | null;
  highlights?: string[] | null;
  coverImage?: unknown;
  body?: PortableTextBlock[];
  gallery?: GalleryImage[] | null;
};

type ChildrenProps = {
  children?: ReactNode;
};

type GalleryImage = {
  alt?: string;
  caption?: string;
} & Record<string, unknown>;

async function getPost(slug: string) {
  if (!sanityClient) return null;

  return sanityClient.fetch<Post | null>(
    POST_BY_SLUG,
    { slug },
    { next: { revalidate } }
  );
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTeamName(team?: string) {
  if (!team) return "";
  if (team === "mixed") return "Mixed / Club";
  return team.charAt(0).toUpperCase() + team.slice(1);
}

function extractBodyText(body?: PortableTextBlock[]): string {
  if (!body?.length) return "";
  const firstBlock = body.find(
    (b): b is PortableTextBlock & { style?: string; children?: Array<{ text?: string }> } =>
      b._type === "block" && "style" in b && b.style === "normal",
  );
  if (!firstBlock) return "";
  return (firstBlock.children || [])
    .map((c) => c.text || "")
    .join("")
    .trim();
}

function buildPostDescription(post: Post): string {
  if (post.postKind === "teamReport") {
    const teamName =
      post.teamDisplay ||
      (Array.isArray(post.teams) && post.teams.length > 0
        ? formatTeamName(post.teams[0])
        : "NDSC");
    if (typeof post.scoreFor === "number" && typeof post.scoreAgainst === "number") {
      const opponent =
        Array.isArray(post.teams) && post.teams.length === 2
          ? formatTeamName(post.teams[1])
          : post.opponent || "opponents";
      return `${teamName} ${post.scoreFor}–${post.scoreAgainst} ${opponent} — Softball Ulster match report from North Down Softball Club, Bangor, Northern Ireland.`.slice(0, 155);
    }
  }
  if (post.excerpt) return post.excerpt.slice(0, 155);
  const bodyText = extractBodyText(post.body);
  if (bodyText) return bodyText.slice(0, 155);
  return "Read the latest North Down Softball Club update from softball Bangor and Softball Ulster competition in Northern Ireland.";
}

const ptComponents = {
  block: {
    normal: ({ children }: ChildrenProps) => (
      <p className="mb-5 leading-8 text-white/85">{children}</p>
    ),
    h1: ({ children }: ChildrenProps) => (
      <h2 className="mb-6 mt-12 text-3xl font-bold text-teal-300">{children}</h2>
    ),
    h2: ({ children }: ChildrenProps) => (
      <h2 className="mb-4 mt-10 text-3xl font-semibold text-teal-300">
        {children}
      </h2>
    ),
    h3: ({ children }: ChildrenProps) => (
      <h3 className="mb-3 mt-8 text-2xl font-semibold text-teal-300">
        {children}
      </h3>
    ),
    h4: ({ children }: ChildrenProps) => (
      <h3 className="mb-2 mt-6 text-xl font-semibold text-teal-300">
        {children}
      </h3>
    ),
    blockquote: ({ children }: ChildrenProps) => (
      <blockquote className="my-6 border-l-4 border-teal-300 pl-4 italic text-white/70">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: ChildrenProps) => (
      <ul className="my-5 list-disc space-y-2 pl-6 text-white/85">{children}</ul>
    ),
  },
  listItem: {
    bullet: ({ children }: ChildrenProps) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }: ChildrenProps) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }: ChildrenProps) => (
      <em className="italic text-white/90">{children}</em>
    ),
  },
  types: {
    image: ({ value }: { value: GalleryImage }) => {
      const src = urlFor(value).width(1200).url();
      const alt =
        value?.alt ||
        "North Down Softball Club action photo from Ward Park Bangor";
      const caption = value?.caption;

      return (
        <figure className="my-8">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              loading="lazy"
            />
          </div>
          {caption ? (
            <figcaption className="mt-2 text-sm text-white/60">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
  },
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return buildMetadata({
      title: buildPageTitle("News Article"),
      description:
        "North Down Softball Club news and match reports from Bangor, Northern Ireland.",
      path: `/news/${slug}`,
    });
  }

  const image = post.coverImage
    ? urlFor(post.coverImage).width(1400).height(800).url()
    : "/hero.jpg";

  return buildMetadata({
    title: buildPageTitle(post.title),
    description: buildPostDescription(post),
    path: `/news/${post.slug}`,
    image,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post._updatedAt || post.publishedAt,
  });
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await getPost(slug);
  if (!post) return notFound();

  const img = post.coverImage
    ? urlFor(post.coverImage).width(1400).height(800).url()
    : null;

  const kindLabel = post.postKind === "teamReport" ? "TEAM REPORT" : "CLUB NEWS";

  const teamDisplay =
    Array.isArray(post.teams) && post.teams.length === 2
      ? `${formatTeamName(post.teams[0])} vs ${formatTeamName(post.teams[1])}`
      : Array.isArray(post.teams) && post.teams.length === 1
        ? formatTeamName(post.teams[0])
        : "-";

  const opponentDisplay =
    Array.isArray(post.teams) && post.teams.length > 1
      ? "Internal Derby"
      : post.opponent || "-";

  const matchTitle =
    post.postKind === "teamReport" &&
    Array.isArray(post.teams) &&
    post.teams.length === 2 &&
    typeof post.scoreFor === "number" &&
    typeof post.scoreAgainst === "number"
      ? `${formatTeamName(post.teams[0])} ${post.scoreFor}-${post.scoreAgainst} ${formatTeamName(post.teams[1])}`
      : null;

  const articleTitle = matchTitle || post.title;
  const articleUrl = absoluteUrl(`/news/${post.slug}`);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: articleTitle,
    description: buildPostDescription(post),
    datePublished: post.publishedAt,
    dateModified: post._updatedAt || post.publishedAt,
    image: img ? [img] : [absoluteUrl("/hero.jpg")],
    mainEntityOfPage: articleUrl,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "News", item: absoluteUrl("/news") },
      { "@type": "ListItem", position: 3, name: articleTitle },
    ],
  };

  return (
    <main className="min-h-screen bg-[#0B1324] text-white">
      <JsonLd data={[articleSchema, breadcrumbSchema]} />
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-6 text-sm text-white/60">
          <Link href="/" className="transition hover:text-teal-300">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="transition hover:text-teal-300">
            News
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">{post.title}</span>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">
            {kindLabel}
          </div>

          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
            {articleTitle}
          </h1>

          <div className="mt-3 text-sm text-white/60">
            {formatDate(post.publishedAt)}
          </div>
        </div>

        {post.postKind === "teamReport" ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`grid grid-cols-2 gap-4 ${post.venue ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
              <div>
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">TEAM</div>
                <div className="mt-1 font-semibold">{teamDisplay}</div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">OPPONENT</div>
                <div className="mt-1 font-semibold">{opponentDisplay}</div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">SCORE</div>
                <div className="mt-1 text-xl font-bold">
                  {typeof post.scoreFor === "number" && typeof post.scoreAgainst === "number"
                    ? `${post.scoreFor}–${post.scoreAgainst}`
                    : "–"}
                </div>
              </div>
              {post.venue ? (
                <div>
                  <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">VENUE</div>
                  <div className="mt-1 font-semibold">{post.venue}</div>
                </div>
              ) : null}
            </div>

            {Array.isArray(post.mvps) && post.mvps.length > 0 ? (
              <div className="mt-5">
                <div className="mb-3 text-xs font-semibold tracking-[0.25em] text-teal-300">
                  MVP&apos;S
                </div>
                <div className={`grid gap-3 ${post.mvps.length >= 2 ? "md:grid-cols-2" : ""}`}>
                  {post.mvps.map((mvp, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-teal-300/20 bg-teal-300/5 p-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                        {mvp.category === "female"
                          ? "Female MVP"
                          : mvp.category === "male"
                            ? "Male MVP"
                            : "MVP"}
                      </div>
                      <div className="mt-1 text-lg font-bold text-white">
                        {mvp.name || "—"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/70">
                        {typeof mvp.runs === "number" ? (
                          <span>
                            <span className="font-semibold text-white">{mvp.runs}</span> Runs
                          </span>
                        ) : null}
                        {typeof mvp.rbis === "number" ? (
                          <span>
                            <span className="font-semibold text-white">{mvp.rbis}</span> RBIs
                          </span>
                        ) : null}
                        {typeof mvp.outs === "number" ? (
                          <span>
                            <span className="font-semibold text-white">{mvp.outs}</span> Outs
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {Array.isArray(post.highlights) && post.highlights.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">HIGHLIGHTS</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
                  {post.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(post.debutants) && post.debutants.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">DEBUTANTS</div>
                <div className="mt-2 text-sm text-white/80">
                  {post.debutants.join(", ")}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {img ? (
            <div className="relative max-h-[520px] overflow-hidden border-b border-white/10 bg-black/10">
              <Image
                src={img}
                alt={`${articleTitle} - North Down Softball Club news image`}
                width={1400}
                height={800}
                className="w-full object-cover"
                priority
              />
            </div>
          ) : null}

          <div className="p-6 md:p-8">
            <article className="max-w-none">
              <PortableText value={post.body ?? []} components={ptComponents} />
            </article>

            <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/75">
              <p>
                Read more from{" "}
                <Link href="/" className="text-teal-300 hover:text-teal-200">
                  North Down Softball Club
                </Link>{" "}
                or jump straight to the{" "}
                <Link href="/#teams" className="text-teal-300 hover:text-teal-200">
                  teams section
                </Link>
                .
              </p>
            </div>

            {Array.isArray(post.gallery) && post.gallery.length > 0 ? (
              <div className="mt-10">
                <div className="text-xs font-semibold tracking-[0.25em] text-teal-300">
                  GALLERY
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {post.gallery.map((galleryImage, i: number) => {
                    const src = urlFor(galleryImage).width(900).url();
                    const alt =
                      galleryImage?.alt ||
                      `${articleTitle} gallery image ${i + 1} from North Down Softball Club`;
                    return (
                      <div
                        key={i}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                      >
                        <Image
                          src={src}
                          alt={alt}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <SiteFooter navLinks={primaryNavLinks} />
    </main>
  );
}
