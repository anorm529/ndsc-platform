import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CLUB_DATA_TAG, CLUB_TEAM_SLUGS } from "@/lib/ndsc-data";

function getRequestSecret(request: Request, url: URL) {
  return (
    url.searchParams.get("secret") ||
    request.headers.get("x-revalidate-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expectedSecret = process.env.REVALIDATE_SECRET;
  const providedSecret = getRequestSecret(request, url);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Invalid revalidation secret." }, { status: 401 });
  }

  console.info("[ndsc-data] Manual revalidation triggered", {
    at: new Date().toISOString(),
  });

  revalidateTag(CLUB_DATA_TAG, "max");
  revalidatePath("/members/home");
  revalidatePath("/members");

  for (const team of CLUB_TEAM_SLUGS) {
    revalidatePath(`/members/teams/${team}`);
  }

  return NextResponse.json({
    ok: true,
    revalidatedAt: new Date().toISOString(),
    tag: CLUB_DATA_TAG,
    paths: ["/members", "/members/home", ...CLUB_TEAM_SLUGS.map((team) => `/members/teams/${team}`)],
  });
}
