import { NextResponse } from "next/server";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ...checks, status: "degraded", db: "not configured" }, { status: 503 });
  }

  try {
    const result = await dbQuery<{
      now: string;
      users: string;
      active_sessions: string;
      pending_users: string;
    }>(`
      SELECT
        NOW()::text AS now,
        (SELECT COUNT(*)::text FROM users)                                          AS users,
        (SELECT COUNT(*)::text FROM user_sessions WHERE expires_at > NOW())        AS active_sessions,
        (SELECT COUNT(*)::text FROM users WHERE account_status = 'pending')        AS pending_users
    `);

    const row = result.rows[0];
    checks.db = {
      status: "ok",
      serverTime: row.now,
      users: Number(row.users),
      activeSessions: Number(row.active_sessions),
      pendingUsers: Number(row.pending_users),
    };
  } catch (err) {
    checks.status = "degraded";
    checks.db = { status: "error", error: err instanceof Error ? err.message : "unknown" };
    return NextResponse.json(checks, { status: 503 });
  }

  return NextResponse.json(checks);
}
