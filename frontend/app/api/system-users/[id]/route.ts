import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/api";

async function forwardSystemUserRequest(request: NextRequest, id: string, method: "PATCH" | "DELETE"): Promise<NextResponse> {
  const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Session required." }, { status: 401 });
  }

  const response = await fetch(`${getServerApiBaseUrl()}/api/system-users/${id}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: method === "PATCH" ? await request.text() : undefined,
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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardSystemUserRequest(request, id, "PATCH");
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardSystemUserRequest(request, id, "DELETE");
}
