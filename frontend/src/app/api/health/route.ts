/**
 * Simple health check for the frontend API. Returns 200 if API routes are deployed.
 * GET https://your-frontend.vercel.app/api/health
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, source: "frontend-api" });
}
