export const runtime = "nodejs";

const BASE_CURRENCY = (process.env.FX_BASE ?? "EUR").trim().toUpperCase();
const QUOTE_CURRENCY = (process.env.FX_QUOTE ?? "SEK").trim().toUpperCase();
const BASE_LOWER = BASE_CURRENCY.toLowerCase();
const QUOTE_LOWER = QUOTE_CURRENCY.toLowerCase();

const FALLBACK_RATE = (() => {
  const raw = Number(process.env.FX_FALLBACK_RATE);
  return Number.isFinite(raw) && raw > 0 ? raw : 11.02;
})();

const CACHE_TTL_MS = (() => {
  const raw = Number(process.env.FX_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 6 * 60 * 60 * 1000; // default 6 timmar
})();

const FALLBACK_TTL_MS = Math.min(CACHE_TTL_MS, 10 * 60 * 1000); // cache fallback kortare (max 10 min)

let cache = { value: null, ts: 0, ttl: 0 };

const CUSTOM_FX_URL = (() => {
  const raw = (process.env.FX_SERVICE_URL ?? process.env.FX_API_URL ?? "").trim();
  return raw.length ? raw : null;
})();

const CUSTOM_AUTH_TOKEN = (() => {
  const raw =
    process.env.FX_SERVICE_TOKEN ??
    process.env.FX_API_TOKEN ??
    process.env.FX_API_KEY ??
    "";
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed : `Bearer ${trimmed}`;
})();

function readCache() {
  if (!cache.value) return null;
  const ttl = cache.ttl || CACHE_TTL_MS;
  if (Date.now() - cache.ts < ttl) {
    return cache.value;
  }
  cache = { value: null, ts: 0, ttl: 0 };
  return null;
}

function writeCache(payload, ttl = CACHE_TTL_MS) {
  cache = { value: payload, ts: Date.now(), ttl };
}

function isValidRate(rate) {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function parseUpdatedAt(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (/^\d{10}$/.test(trimmed)) {
        const unixSeconds = Number(trimmed);
        if (Number.isFinite(unixSeconds)) {
          return new Date(unixSeconds * 1000).toISOString();
        }
      }
      if (/^\d{13}$/.test(trimmed)) {
        const unixMillis = Number(trimmed);
        if (Number.isFinite(unixMillis)) {
          return new Date(unixMillis).toISOString();
        }
      }
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const iso = new Date(`${trimmed}T00:00:00Z`);
        if (!Number.isNaN(iso.getTime())) {
          return iso.toISOString();
        }
      }
    }
  }
  return new Date().toISOString();
}

function extractCustomRate(data) {
  if (!data || typeof data !== "object") return null;
  const directCandidates = [
    data.rate,
    data.fxRate,
    data.mid,
    data.midRate,
    data.value,
    data.price,
    data[QUOTE_CURRENCY],
    data[QUOTE_LOWER],
  ];
  for (const candidate of directCandidates) {
    const num = toNumber(candidate);
    if (num != null) return num;
  }

  const containers = [
    data.rates,
    data.data,
    data.data?.rates,
    data.payload,
    data.payload?.rates,
    data.result,
    data.result?.rates,
    data.quote,
    data.quotes,
  ];

  const pairKeys = [
    `${BASE_CURRENCY}${QUOTE_CURRENCY}`,
    `${BASE_CURRENCY}_${QUOTE_CURRENCY}`,
    `${BASE_CURRENCY}/${QUOTE_CURRENCY}`,
    `${BASE_LOWER}${QUOTE_LOWER}`,
    `${BASE_LOWER}_${QUOTE_LOWER}`,
    `${BASE_LOWER}/${QUOTE_LOWER}`,
  ];

  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    const direct = toNumber(container[QUOTE_CURRENCY]) ?? toNumber(container[QUOTE_LOWER]);
    if (direct != null) return direct;
    for (const key of pairKeys) {
      const num = toNumber(container[key]);
      if (num != null) return num;
    }
  }

  return null;
}

function respond(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function fetchFromCustom() {
  if (!CUSTOM_FX_URL) return null;
  const headers = { Accept: "application/json" };
  if (CUSTOM_AUTH_TOKEN) headers.Authorization = CUSTOM_AUTH_TOKEN;

  const res = await fetch(CUSTOM_FX_URL, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`custom HTTP ${res.status}`);
  }
  const data = await res.json();
  const rate = extractCustomRate(data);
  if (!isValidRate(rate)) {
    throw new Error("custom returned invalid rate");
  }
  const updatedAt = parseUpdatedAt(
    data.updatedAt,
    data.updated_at,
    data.timestamp,
    data.time,
    data.date,
    data.lastUpdated,
    data.last_updated,
    data.time_last_update,
    data.time_last_update_unix,
    data.time_last_update_utc
  );
  const source =
    typeof data.source === "string" && data.source.trim()
      ? data.source
      : typeof data.provider === "string" && data.provider.trim()
      ? data.provider
      : "custom";
  return {
    base: (data.base ?? data.baseCurrency ?? BASE_CURRENCY).toString().toUpperCase(),
    quote: (data.quote ?? data.quoteCurrency ?? QUOTE_CURRENCY).toString().toUpperCase(),
    rate,
    updatedAt,
    source,
  };
}

async function fetchFromFrankfurter() {
  const url = `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}&to=${QUOTE_CURRENCY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`frankfurter HTTP ${res.status}`);
  }
  const data = await res.json();
  const rate = toNumber(data?.rates?.[QUOTE_CURRENCY] ?? data?.rates?.[QUOTE_LOWER]);
  if (!isValidRate(rate)) {
    throw new Error("frankfurter returned invalid rate");
  }
  const updatedAt = parseUpdatedAt(data.date, data.time);
  return {
    base: (data.base ?? BASE_CURRENCY).toString().toUpperCase(),
    quote: QUOTE_CURRENCY,
    rate,
    updatedAt,
    source: "api.frankfurter.app",
  };
}

async function fetchFromOpenErApi() {
  const url = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`open.er-api HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data?.result && data.result !== "success") {
    const type = data?.error?.type ?? data?.error ?? "unknown error";
    throw new Error(`open.er-api error: ${type}`);
  }
  const rate = toNumber(data?.rates?.[QUOTE_CURRENCY] ?? data?.rates?.[QUOTE_LOWER]);
  if (!isValidRate(rate)) {
    throw new Error("open.er-api returned invalid rate");
  }
  const updatedAt = parseUpdatedAt(
    Number.isFinite(data?.time_last_update_unix) ? data.time_last_update_unix * 1000 : null,
    data?.time_last_update_utc,
    data?.time_last_update
  );
  return {
    base: (data.base_code ?? data.base ?? BASE_CURRENCY).toString().toUpperCase(),
    quote: QUOTE_CURRENCY,
    rate,
    updatedAt,
    source: "open.er-api.com",
  };
}

export async function GET() {
  const cached = readCache();
  if (cached) {
    return respond(cached);
  }

  const attempts = [];
  const fetchers = [];

  if (CUSTOM_FX_URL) {
    fetchers.push(["custom", fetchFromCustom]);
  }
  fetchers.push(["frankfurter", fetchFromFrankfurter]);
  fetchers.push(["open.er-api", fetchFromOpenErApi]);

  for (const [label, fetcher] of fetchers) {
    try {
      const payload = await fetcher();
      if (payload && isValidRate(payload.rate)) {
        const normalized = {
          base: payload.base ?? BASE_CURRENCY,
          quote: payload.quote ?? QUOTE_CURRENCY,
          rate: payload.rate,
          updatedAt: payload.updatedAt ?? new Date().toISOString(),
          source: payload.source ?? label,
        };
        writeCache(normalized, CACHE_TTL_MS);
        return respond(normalized);
      }
      attempts.push(`${label}: invalid payload`);
    } catch (err) {
      attempts.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const fallback = {
    base: BASE_CURRENCY,
    quote: QUOTE_CURRENCY,
    rate: FALLBACK_RATE,
    updatedAt: new Date().toISOString(),
    source: "fallback",
  };

  if (attempts.length && process.env.NODE_ENV !== "production") {
    fallback.meta = { attempts };
  }

  writeCache(fallback, FALLBACK_TTL_MS);
  return respond(fallback);
}
