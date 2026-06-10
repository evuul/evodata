// Shared Upstash KV client helpers for server routes and stores.

let kvClientPromise = null;

const cleanCandidates = (values) =>
  values.map((value) => String(value || "").trim()).filter(Boolean);

export function resolveKvRestConfig(env = process.env) {
  const urlCandidates = [
    env.KV_REST_API_URL,
    env.UPSTASH_REST_URL,
    env.UPSTASH_REDIS_REST_URL,
    env.KV_URL,
  ];
  const tokenCandidates = [
    env.KV_REST_API_TOKEN,
    env.UPSTASH_REST_TOKEN,
    env.UPSTASH_REDIS_REST_TOKEN,
    env.KV_REST_TOKEN,
  ];

  return {
    url: cleanCandidates(urlCandidates)[0] || null,
    token: cleanCandidates(tokenCandidates)[0] || null,
    readOnlyToken: String(env.KV_REST_API_READ_ONLY_TOKEN || "").trim() || null,
  };
}

export function applyKvEnvAliases(env = process.env) {
  const config = resolveKvRestConfig(env);

  if (!env.KV_REST_API_URL && config.url) {
    env.KV_REST_API_URL = config.url;
  }
  if (!env.KV_REST_API_TOKEN && config.token) {
    env.KV_REST_API_TOKEN = config.token;
  }

  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

export function getKvRestHost(env = process.env) {
  try {
    const { url } = resolveKvRestConfig(env);
    return new URL(String(url || "").trim()).host;
  } catch {
    return null;
  }
}

export function requireKvRestConfig(options = {}) {
  const config = resolveKvRestConfig();
  if (!config.url || !config.token) {
    const error = new Error("Missing Upstash REST URL or token");
    error.code = options.missingCode || "KV_REST_MISSING_ENV";
    throw error;
  }
  return config;
}

export async function kvRestRequest(path, init = {}, options = {}) {
  const { url, token } = requireKvRestConfig(options);
  const baseUrl = String(url).trim();
  const requestUrl = new URL(path, baseUrl).toString();
  const method = init.method || "GET";
  const errorPrefix = options.errorCodePrefix || "KV_REST";
  const serviceName = options.serviceName || "Upstash";

  try {
    const res = await fetch(requestUrl, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const responseText = await res.text();
      const error = new Error(`${serviceName} ${path} failed: ${res.status} ${responseText}`);
      error.code = `${errorPrefix}_HTTP_ERROR`;
      error.status = res.status;
      error.path = path;
      error.method = method;
      error.upstashHost = getKvRestHost();
      throw error;
    }

    return res.json();
  } catch (error) {
    if (error && typeof error === "object") {
      error.code ||= `${errorPrefix}_REQUEST_ERROR`;
      error.path ||= path;
      error.method ||= method;
      error.upstashHost ||= getKvRestHost();
    }
    throw error;
  }
}

export async function getKvClient() {
  if (kvClientPromise) return kvClientPromise;

  kvClientPromise = (async () => {
    if (!applyKvEnvAliases()) {
      return undefined;
    }
    try {
      const mod = await import("@vercel/kv");
      return mod.kv;
    } catch {
      return undefined;
    }
  })();

  return kvClientPromise;
}
