/**
 * Simple health check for the frontend API. Returns 200 if API routes are deployed.
 * GET https://your-frontend.vercel.app/api/health
 */
import { NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET() {
  return NextResponse.json({ ok: true, source: "frontend-api" }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
