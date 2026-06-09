let kvClientPromise = null;

export function applyKvEnvAliases() {
  const urlCandidates = [
    process.env.KV_REST_API_URL,
    process.env.UPSTASH_REST_URL,
    process.env.UPSTASH_REDIS_REST_URL,
  ].filter(Boolean);
  const tokenCandidates = [
    process.env.KV_REST_API_TOKEN,
    process.env.UPSTASH_REST_TOKEN,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.KV_REST_TOKEN,
  ].filter(Boolean);

  if (!process.env.KV_REST_API_URL && urlCandidates.length) {
    process.env.KV_REST_API_URL = urlCandidates[0];
  }
  if (!process.env.KV_REST_API_TOKEN && tokenCandidates.length) {
    process.env.KV_REST_API_TOKEN = tokenCandidates[0];
  }

  if (!process.env.KV_REST_API_URL && process.env.KV_URL) {
    process.env.KV_REST_API_URL = process.env.KV_URL;
  }
  if (!process.env.KV_REST_API_TOKEN && process.env.KV_REST_TOKEN) {
    process.env.KV_REST_API_TOKEN = process.env.KV_REST_TOKEN;
  }

  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
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
