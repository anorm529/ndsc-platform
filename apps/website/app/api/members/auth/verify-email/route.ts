import { NextResponse } from "next/server";
import { consumeVerificationToken, markEmailVerified } from "@ndsc/auth";

function redirectTo(req: Request, status: "success" | "invalid") {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : new URL(req.url).origin;
  return NextResponse.redirect(`${base}/members/verify-email?status=${status}`);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";

  if (!token) return redirectTo(req, "invalid");

  const userId = await consumeVerificationToken(token);
  if (!userId) return redirectTo(req, "invalid");

  await markEmailVerified(userId);
  return redirectTo(req, "success");
}
