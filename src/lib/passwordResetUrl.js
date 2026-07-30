// Builds password-reset links from a trusted application origin.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const parseOrigin = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname))) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
};

export function resolveTrustedAppOrigin(requestUrl, env = process.env) {
  const configured = parseOrigin(
    env.APP_ORIGIN
    || env.NEXT_PUBLIC_SITE_URL
    || env.VERCEL_PROJECT_PRODUCTION_URL
  );
  if (configured) return configured;
  const requestOrigin = parseOrigin(requestUrl);
  if (!requestOrigin) throw new Error("A trusted application origin is required");
  return requestOrigin;
}

export function buildPasswordResetUrl({ requestUrl, email, token, env = process.env }) {
  const url = new URL("/reset-password", resolveTrustedAppOrigin(requestUrl, env));
  url.searchParams.set("email", String(email || "").trim().toLowerCase());
  url.searchParams.set("token", String(token || ""));
  return url.toString();
}
