/**
 * Shared proxy helpers for /api/* → backend. Used by catch-all and explicit routes.
 * Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL on the frontend (Vercel env).
 */
import { NextRequest, NextResponse } from "next/server";

export function getBackendBase(): string {
  const target = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL;
  if (target && target.trim() !== "") {
    let base = target.replace(/\/$/, "").trim();
    if (base.endsWith("/api")) base = base.slice(0, -4);
    return base;
  }
  return "http://localhost:8000";
}

export async function proxyToBackend(
  request: NextRequest,
  pathAfterApi: string,
  search = ""
): Promise<NextResponse> {
  const base = getBackendBase();
  const url = `${base}/api/${pathAfterApi}${search}`;

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
    const res = await fetch(url, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === "transfer-encoding" || k === "content-encoding") return;
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
      {
        detail: message,
        hint: "Backend unreachable. Set API_PROXY_TARGET or NEXT_PUBLIC_API_URL on the frontend Vercel project.",
        attempted: url,
      },
      { status: 502 }
    );
  }
}
