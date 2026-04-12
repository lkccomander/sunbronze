import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return forwardApiRequest(request, "/api/auth/me", "GET");
}
