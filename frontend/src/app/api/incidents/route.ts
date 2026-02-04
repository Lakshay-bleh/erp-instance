/**
 * GET (list) and POST (create) for /api/incidents.
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(request: NextRequest) {
  const search = request.nextUrl.search || "";
  return proxyToBackend(request, "incidents", search);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
