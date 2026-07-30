// Configures framework behavior and global response security headers.

import { getSecurityHeaders } from "./src/lib/securityHeaders.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders({ isDevelopment: process.env.NODE_ENV === "development" }),
      },
    ];
  },
};

export default nextConfig;
