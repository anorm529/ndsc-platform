import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  CLUB_DATA_TAG,
  CLUB_TEAM_SLUGS,
  publishClubDataSnapshot,
} from "@/lib/ndsc-data";

function getRequestSecret(request: Request, url: URL) {
  return (
    url.searchParams.get("secret") ||
    request.headers.get("x-revalidate-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const expectedSecret = process.env.REVALIDATE_SECRET;
  const providedSecret = getRequestSecret(request, url);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Invalid publish secret." }, { status: 401 });
  }

  try {
    const blob = await publishClubDataSnapshot();

    revalidateTag(CLUB_DATA_TAG, "max");
    revalidatePath("/members");
    revalidatePath("/members/home");

    for (const team of CLUB_TEAM_SLUGS) {
      revalidatePath(`/members/teams/${team}`);
    }

    return NextResponse.json({
      ok: true,
      publishedAt: new Date().toISOString(),
      blob,
      warnings: blob.warnings,
      paths: ["/members", "/members/home", ...CLUB_TEAM_SLUGS.map((team) => `/members/teams/${team}`)],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publish failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
