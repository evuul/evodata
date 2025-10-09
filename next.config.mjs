/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
  outputFileTracingIncludes: {
    "/api/casinoscores/players/[game]": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/casinoscores/players/[game]/route": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
