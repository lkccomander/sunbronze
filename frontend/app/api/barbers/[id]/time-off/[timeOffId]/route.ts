import { NextRequest, NextResponse } from "next/server";

import { forwardApiRequest } from "@/lib/api-proxy";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; timeOffId: string }> }): Promise<NextResponse> {
  const { id, timeOffId } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/time-off/${timeOffId}`, "PATCH", { body: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; timeOffId: string }> }): Promise<NextResponse> {
  const { id, timeOffId } = await context.params;
  return forwardApiRequest(request, `/api/barbers/${id}/time-off/${timeOffId}`, "DELETE");
}
