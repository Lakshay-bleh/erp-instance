/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* to backend when API_PROXY_TARGET is set (avoids CORS: browser stays same-origin)
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL;
    if (target) {
      let base = target.replace(/\/$/, "");
      // Avoid double /api: backend root is e.g. https://x.vercel.app (routes are /api/incidents)
      if (base.endsWith("/api")) base = base.slice(0, -4);
      return [{ source: "/api/:path*", destination: `${base}/api/:path*` }];
    }
    return [];
  },
};

module.exports = nextConfig;
