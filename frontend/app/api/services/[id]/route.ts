import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/services/${id}`, "GET");
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/services/${id}`, "PATCH", { body: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/services/${id}`, "DELETE");
}
