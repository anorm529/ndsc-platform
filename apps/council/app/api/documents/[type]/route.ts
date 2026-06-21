import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await getCouncilUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  const result = await mainQuery<{
    data: Buffer;
    filename: string;
    content_type: string;
  }>(
    `SELECT data, filename, content_type FROM club_documents WHERE type = $1`,
    [type]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, filename, content_type } = result.rows[0];
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": content_type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
