/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CORS for /api/* so Vercel preview URLs and cross-origin work; browser always uses same-origin /api (proxy)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
  // Avoid stale vendor-chunk references when mixing dev and build (404s on static/chunks)
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

module.exports = nextConfig;
