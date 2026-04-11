import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getPublicUrl } from "@/lib/url";

export async function POST(request: Request) {
  const response = NextResponse.redirect(getPublicUrl(request, "/login"), { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
