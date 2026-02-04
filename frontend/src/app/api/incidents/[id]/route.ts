/**
 * GET /api/incidents/:id and DELETE /api/incidents/:id (single segment — reliable on Vercel).
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

async function handle(request: NextRequest, params: Params) {
  const { id } = await Promise.resolve(params);
  const path = `incidents/${id}`;
  const search = request.nextUrl.search || "";
  return proxyToBackend(request, path, search);
}

export async function GET(request: NextRequest, ctx: { params: Params }) {
  return handle(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Params }) {
  return handle(request, ctx.params);
}

export async function DELETE(request: NextRequest, ctx: { params: Params }) {
  return handle(request, ctx.params);
}

export async function OPTIONS(request: NextRequest, ctx: { params: Params }) {
  return handle(request, ctx.params);
}
