import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getUploadTemplates } from "@/lib/neon-admin";

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ targetTable: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { targetTable } = await params;
  const templates = await getUploadTemplates();
  const template = templates.find((entry) => entry.targetTable === targetTable);

  if (!template) {
    return NextResponse.json({ error: "Unknown upload template." }, { status: 404 });
  }

  const csv = `${template.headers.map(escapeCsvCell).join(",")}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${targetTable}-template.csv"`,
    },
  });
}
