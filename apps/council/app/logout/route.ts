import { NextResponse } from "next/server";
import { clearCouncilSession } from "@/lib/council-session";

export async function POST(request: Request) {
  await clearCouncilSession();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}
