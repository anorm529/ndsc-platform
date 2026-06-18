import { NextResponse } from "next/server";
import { requireCurrentUser, updatePlayerProfile } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await requireCurrentUser();
  const body = await req.json().catch(() => ({}));

  try {
    await updatePlayerProfile(user.playerId, {
      position: String(body.position ?? ""),
      bats: String(body.bats ?? ""),
      throws: String(body.throws ?? ""),
      shirtNumber: body.shirtNumber === "" ? null : Number(body.shirtNumber),
      profileImageUrl: String(body.profileImageUrl ?? ""),
      membershipStatus: String(body.membershipStatus ?? ""),
      memberSince: body.memberSince === "" ? null : Number(body.memberSince),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update profile.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
