import type { Metadata } from "next";

export const SITE_NAME = "North Down Softball Club";
export const SITE_URL = "https://northdownsoftballclub.co.uk";
export const SITE_EMAIL = "northdownsoftballclub@gmail.com";
export const DEFAULT_OG_IMAGE = "/hero.jpg";
export const TITLE_SUFFIX = "North Down Softball Club — Softball in Bangor, Northern Ireland";

type BuildMetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function buildPageTitle(topic: string) {
  return `${topic} | ${TITLE_SUFFIX}`;
}

export function buildMetadata({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
  modifiedTime,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: imageUrl,
          alt: `${SITE_NAME} softball in Bangor, Northern Ireland`,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function jsonLd<T>(data: T) {
  return JSON.stringify(data);
}
