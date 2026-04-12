import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getServerApiBaseUrl } from "@/lib/api";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

type ProxyMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function forwardApiRequest(
  request: NextRequest,
  path: string,
  method: ProxyMethod,
  options: { auth?: boolean; body?: boolean } = {},
): Promise<NextResponse> {
  const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (options.auth !== false && !accessToken) {
    return NextResponse.json({ error: "Session required." }, { status: 401 });
  }

  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    method,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
    },
    body: options.body ? await request.text() : undefined,
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
