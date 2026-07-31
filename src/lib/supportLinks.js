// Builds safe, source-tagged Buy Me a Coffee links shared by web and email surfaces.

export const DEFAULT_SUPPORT_URL = "https://buymeacoffee.com/evuul";

const ALLOWED_SUPPORT_HOSTS = new Set(["buymeacoffee.com", "www.buymeacoffee.com"]);

function normalizeSource(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.slice(0, 64) || "unknown";
}

export function resolveSupportBaseUrl(candidate) {
  try {
    const url = new URL(candidate || DEFAULT_SUPPORT_URL);
    if (url.protocol !== "https:" || !ALLOWED_SUPPORT_HOSTS.has(url.hostname.toLowerCase())) {
      return DEFAULT_SUPPORT_URL;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SUPPORT_URL;
  }
}

export function buildSupportUrl(source, candidate = DEFAULT_SUPPORT_URL) {
  const url = new URL(resolveSupportBaseUrl(candidate));
  const normalizedSource = normalizeSource(source);
  url.searchParams.set("utm_source", "evotracker");
  url.searchParams.set("utm_medium", normalizedSource.startsWith("email_") ? "email" : "web");
  url.searchParams.set("utm_campaign", "support");
  url.searchParams.set("utm_content", normalizedSource);
  return url.toString();
}
