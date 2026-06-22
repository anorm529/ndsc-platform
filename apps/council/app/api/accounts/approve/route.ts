import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { approveAccount, denyAccount } from "@/lib/account-queries";

const ELEVATED = new Set(["chairman", "vice_chair"]);

function isElevated(user: NonNullable<Awaited<ReturnType<typeof getCouncilUser>>>) {
  return user.isOwner || [...user.councilPermissions].some((p) => ELEVATED.has(p));
}

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !isElevated(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action } = await req.json() as { userId?: string; action?: string };
  if (!userId || !["approve", "deny"].includes(action ?? "")) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  if (action === "approve") {
    await approveAccount(userId, user.id);
  } else {
    await denyAccount(userId, user.id);
  }

  return NextResponse.json({ ok: true });
}
