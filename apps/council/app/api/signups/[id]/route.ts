import { NextRequest, NextResponse } from "next/server";
import { requireCouncilUser } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCouncilUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { rowCount } = await councilQuery(
    `DELETE FROM tournament_interest WHERE id = $1`,
    [id]
  );

  if (!rowCount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
