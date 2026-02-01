/**
 * Proxy all /api/* requests to the backend. Browser only talks to this (same-origin) → no CORS.
 * Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL on the frontend project (Vercel env vars).
 */
import { NextRequest, NextResponse } from "next/server";

function getBackendBase(): string {
  const target = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL;
  if (target && target.trim() !== "") {
    let base = target.replace(/\/$/, "").trim();
    if (base.endsWith("/api")) base = base.slice(0, -4);
    return base;
  }
  return "http://localhost:8000";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path);
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const base = getBackendBase();
  const url = `${base}/api/${path}`;
  const search = request.nextUrl.search;
  const fullUrl = search ? `${url}${search}` : url;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (
      key.toLowerCase() === "host" ||
      key.toLowerCase() === "connection" ||
      key.toLowerCase() === "content-length"
    )
      return;
    headers.set(key, value);
  });

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const res = await fetch(fullUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      resHeaders.set(key, value);
    });

    const resBody = res.status === 204 ? undefined : await res.text();
    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proxy failed";
    return NextResponse.json(
      { detail: message },
      { status: 502 }
    );
  }
}
