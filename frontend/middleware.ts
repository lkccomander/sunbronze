import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getPublicUrl } from "@/lib/url";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/_next/")) {
    return true;
  }

  if (pathname === "/favicon.ico") {
    return true;
  }

  return /\.[^/]+$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(getPublicUrl(request, "/dashboard"));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = getPublicUrl(request, "/login");
    const nextPath = `${pathname}${search}`;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
