/**
 * All /api/incidents/:id and subpaths (status, tags, enrich). Required catch-all (one+ segments).
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { rest: string[] } | Promise<{ rest: string[] }>;

async function handle(request: NextRequest, params: Params) {
  const resolved = await Promise.resolve(params);
  const rest = resolved.rest ?? [];
  const path = `incidents/${rest.join("/")}`;
  const search = request.nextUrl.search || "";
  return proxyToBackend(request, path, search);
}

export async function GET(request: NextRequest, ctx: { params: Params }) {
  return handle(request, ctx.params);
}

export async function POST(request: NextRequest, ctx: { params: Params }) {
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
