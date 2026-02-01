/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /api/* is handled by src/app/api/[...path]/route.ts (proxy to backend). No rewrites needed.
};

module.exports = nextConfig;
