import { NextResponse } from "next/server";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public endpoint: report liveness only — no counts, errors, or server details.
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ status: "degraded", db: "not configured" }, { status: 503 });
  }

  try {
    await dbQuery("SELECT 1");
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded", db: "error" }, { status: 503 });
  }
}
