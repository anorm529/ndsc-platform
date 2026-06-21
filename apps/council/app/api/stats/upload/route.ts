import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { parseCsvText, previewCsvImport, importCsvRows } from "@/lib/stats-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  const elevated = new Set(["chairman", "vice_chair"]);
  const hasAccess = user?.isOwner || [...(user?.councilPermissions ?? [])].some((p) => elevated.has(p));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    csv?: string;
    mode?: "preview" | "import";
  };

  const { csv, mode = "preview" } = body;
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv text required" }, { status: 400 });
  }

  const rows = parseCsvText(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }

  if (mode === "preview") {
    const preview = await previewCsvImport(rows);
    return NextResponse.json(preview);
  }

  const result = await importCsvRows(rows);
  return NextResponse.json(result);
}
