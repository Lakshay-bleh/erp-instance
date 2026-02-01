/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* to backend (avoids CORS: browser stays same-origin).
  // Vercel: set API_PROXY_TARGET=https://your-backend.vercel.app (no /api), leave NEXT_PUBLIC_API_URL unset.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL;
    if (!target || target.trim() === "") return [];
    let base = target.replace(/\/$/, "").trim();
    if (base.endsWith("/api")) base = base.slice(0, -4);
    return [{ source: "/api/:path*", destination: `${base}/api/:path*` }];
  },
};

module.exports = nextConfig;
