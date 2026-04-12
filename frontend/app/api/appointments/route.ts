import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

function appointmentPath(request: NextRequest): string {
  return `/api/appointments${request.nextUrl.search}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return forwardApiRequest(request, appointmentPath(request), "GET");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return forwardApiRequest(request, "/api/appointments", "POST", { body: true });
}
