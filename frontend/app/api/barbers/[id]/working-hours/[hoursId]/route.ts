import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; hoursId: string }> }): Promise<NextResponse> {
  const { id, hoursId } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/working-hours/${hoursId}`, "PATCH", { body: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; hoursId: string }> }): Promise<NextResponse> {
  const { id, hoursId } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/working-hours/${hoursId}`, "DELETE");
}
