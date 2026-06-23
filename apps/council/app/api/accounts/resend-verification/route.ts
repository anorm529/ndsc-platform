import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";
import { createInviteToken, sendVerificationEmail } from "@/lib/invite";
import { logEmailEvent } from "@ndsc/auth";

export async function POST(req: NextRequest) {
  const actor = await getCouncilUser();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json() as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const res = await mainQuery<{
    email: string;
    registration_name: string | null;
    account_status: string;
    email_verified: boolean;
  }>(
    `SELECT email, registration_name, account_status, email_verified FROM users WHERE id = $1`,
    [userId]
  );

  const account = res.rows[0];
  if (!account) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (account.account_status !== "pending") {
    return NextResponse.json({ error: "Account is not pending" }, { status: 400 });
  }

  const displayName = account.registration_name ?? account.email.split("@")[0];
  const token = await createInviteToken(userId);

  try {
    await sendVerificationEmail(account.email, displayName, token);
    await logEmailEvent({ userId, email: account.email, type: "player_invite", status: "sent" });
  } catch (err) {
    await logEmailEvent({
      userId, email: account.email, type: "player_invite", status: "failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
