import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/working-hours`, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/working-hours`, "POST", { body: true });
}
