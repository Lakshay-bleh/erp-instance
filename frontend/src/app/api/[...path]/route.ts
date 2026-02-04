/**
 * Proxy all /api/* requests to the backend. Browser only talks to this (same-origin) → no CORS.
 * Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL on the frontend project (Vercel env vars).
 * api/incidents/* is handled by api/incidents/[[...rest]]/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { getBackendBase, proxyToBackend } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { path: string[] } | Promise<{ path: string[] }>;

async function getPath(request: NextRequest, params: Params) {
  const resolved = await Promise.resolve(params);
  return runProxy(request, resolved.path ?? []);
}

export async function GET(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

export async function POST(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

export async function PUT(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

export async function DELETE(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

export async function OPTIONS(request: NextRequest, ctx: { params: Params }) {
  return getPath(request, ctx.params);
}

async function runProxy(request: NextRequest, pathSegments: string[]) {
  if (pathSegments.length === 1 && pathSegments[0] === "debug-proxy") {
    const base = getBackendBase();
    return NextResponse.json({
      backendBase: base,
      hasApiProxyTarget: !!process.env.API_PROXY_TARGET,
      hasNextPublicApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
      exampleUrl: `${base}/api/incidents`,
      hint: base === "http://localhost:8000" ? "Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL on the frontend Vercel project." : "If PATCH still returns 502, test the backend directly: curl " + base + "/api/health",
    });
  }

  const path = pathSegments.join("/");
  const search = request.nextUrl.search || "";
  return proxyToBackend(request, path, search);
}
