// Configures framework behavior and global response security headers.

import { getSecurityHeaders } from "./src/lib/securityHeaders.js";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
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
