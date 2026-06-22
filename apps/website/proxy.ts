import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "ndsc_session";

function decodeBasicAuth(encoded: string) {
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

// Set to false to restore normal access to the members section.
const MAINTENANCE_MODE = false;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/members")) {
    if (MAINTENANCE_MODE && pathname !== "/members/maintenance") {
      const url = request.nextUrl.clone();
      url.pathname = "/members/maintenance";
      return NextResponse.redirect(url);
    }

    if (
      pathname === "/members" ||
      pathname === "/members/maintenance" ||
      pathname === "/members/register" ||
      pathname === "/members/pending" ||
      pathname === "/members/forgot-password" ||
      pathname === "/members/reset-password" ||
      pathname.startsWith("/api/members")
    ) {
      return NextResponse.next();
    }

    const authed = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/members";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (!pathname.startsWith("/studio")) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");

  if (!auth) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Studio"',
      },
    });
  }

  const [, encoded] = auth.split(" ");
  const decoded = decodeBasicAuth(encoded ?? "");
  const [, password] = decoded.split(":");

  if (password !== process.env.STUDIO_PASSWORD) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Studio"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/members/:path*"],
};
