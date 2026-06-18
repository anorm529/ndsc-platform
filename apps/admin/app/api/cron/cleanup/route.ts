import { NextResponse } from "next/server";
import { cleanExpiredSessions, cleanExpiredResetTokens } from "@ndsc/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sessions, tokens] = await Promise.all([
    cleanExpiredSessions(),
    cleanExpiredResetTokens(),
  ]);

  console.log(`[cron/cleanup] Removed ${sessions} expired sessions, ${tokens} expired tokens`);

  return NextResponse.json({ ok: true, sessions, tokens });
}
