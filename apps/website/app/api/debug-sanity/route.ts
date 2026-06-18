import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";

export async function GET() {
  if (!sanityClient) {
    return NextResponse.json({
      count: 0,
      data: [],
      warning: "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET.",
    });
  }

  const data = await sanityClient.fetch(`
    *[_type=="post"] | order(_updatedAt desc)[0...20]{
      _id,
      title,
      "slug": slug.current,
      postKind,
      team,
      publishedAt,
      _updatedAt
    }
  `);

  return NextResponse.json({ count: data.length, data });
}
