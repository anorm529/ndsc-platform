import type { MetadataRoute } from "next";
import { sanityClient } from "@/lib/sanity/client";
import { ALL_POST_SLUGS } from "@/lib/sanity/queries";
import { SITE_URL } from "@/lib/seo";

type SitemapPost = {
  slug: string;
  publishedAt?: string;
  _updatedAt?: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = sanityClient
    ? await sanityClient.fetch<SitemapPost[]>(
        ALL_POST_SLUGS,
        {},
        { next: { revalidate: 300 } }
      )
    : [];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/standings`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tournaments`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const articlePages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}`,
    lastModified: new Date(post._updatedAt || post.publishedAt || Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
