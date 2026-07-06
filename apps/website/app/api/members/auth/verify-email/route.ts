import { NextResponse } from "next/server";
import { consumePasswordResetToken, markEmailVerified } from "@ndsc/auth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const origin = new URL(req.url).origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/members?verified=invalid`);
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.redirect(`${origin}/members?verified=invalid`);
  }

  await markEmailVerified(userId);
  return NextResponse.redirect(`${origin}/members?verified=1`);
}
