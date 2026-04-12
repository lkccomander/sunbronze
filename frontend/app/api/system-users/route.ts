import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/api";

async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? null;
}

async function forwardSystemUsersRequest(request: NextRequest, method: "GET" | "POST"): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Session required." }, { status: 401 });
  }

  const response = await fetch(`${getServerApiBaseUrl()}/api/system-users`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return forwardSystemUsersRequest(request, "GET");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return forwardSystemUsersRequest(request, "POST");
}
