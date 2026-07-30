// Builds the browser security policy shared by every application route.

const VERCEL_SCRIPT_ORIGIN = "https://va.vercel-scripts.com";
const VERCEL_INSIGHTS_ORIGIN = "https://*.vercel-insights.com";

export const buildContentSecurityPolicy = ({ isDevelopment = false } = {}) => {
  const scriptSources = ["'self'", "'unsafe-inline'", VERCEL_SCRIPT_ORIGIN];
  if (isDevelopment) scriptSources.push("'unsafe-eval'");

  const directives = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["object-src", "'none'"],
    ["script-src", ...scriptSources],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", "https:"],
    ["font-src", "'self'", "data:"],
    ["connect-src", "'self'", VERCEL_SCRIPT_ORIGIN, VERCEL_INSIGHTS_ORIGIN],
    ["frame-src", "'self'"],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["media-src", "'self'"],
  ];

  if (!isDevelopment) directives.push(["upgrade-insecure-requests"]);

  return directives.map((directive) => directive.join(" ")).join("; ");
};

export const getSecurityHeaders = ({ isDevelopment = false } = {}) => {
  const headers = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy({ isDevelopment }) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    {
      key: "Permissions-Policy",
      value: "browsing-topics=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
  ];

  if (!isDevelopment) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
};
