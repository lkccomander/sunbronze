import { NextResponse } from "next/server";

import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/api";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

type LoginResponseBody = {
  access_token: string;
};

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${getServerApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach auth service." }, { status: 502 });
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  let loginPayload: LoginResponseBody;
  try {
    loginPayload = (await upstreamResponse.json()) as LoginResponseBody;
  } catch {
    return NextResponse.json({ error: "Unexpected auth response." }, { status: 502 });
  }

  if (!loginPayload.access_token) {
    return NextResponse.json({ error: "Auth token not returned." }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, loginPayload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
