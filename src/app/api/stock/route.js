import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=60, s-maxage=60, stale-while-revalidate=120";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minuter (per-instans)
const STALE_IF_ERROR_MS = 10 * 60 * 1000; // 10 minuters fallback om upstream dör
const RETRY_AFTER_SECONDS = 120;
const SHARED_CACHE_TTL_MS = 10 * 60 * 1000; // delad cache (KV) 10 min
const SHARED_STALE_MS = 60 * 60 * 1000; // få chans att svara med gammalt istället för 500 (1h)
const SHARED_KEY_PREFIX = "stock:quote:";
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000; // slå inte Yahoo tätare än 2 min
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // vid 429: vila 10 min
const MANUAL_PAUSE_MS = 24 * 60 * 60 * 1000; // håll paus 24h globalt
const SHARED_PAUSE_KEY_PREFIX = "stock:pause:";
const SHARED_PAUSE_FLAG_PREFIX = "stock:pause-once:";
const FETCH_ENABLED = process.env.YAHOO_FETCH_ENABLED === "true"; // default avstängt tills vi sätter true

const g = globalThis;
g.__stockRouteCache ??= new Map();
g.__stockRouteKvClient ??= null;
g.__stockRouteState ??= new Map(); // symbol -> { inFlight, nextAllowedAt }

function makeEtag(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `W/"${h.toString(16)}"`;
}

function getCached(symbol, { allowStale = false } = {}) {
  const hit = g.__stockRouteCache.get(symbol);
  if (!hit) return null;
  const now = Date.now();
  if (hit.exp > now) return { ...hit, stale: false };
  if (allowStale && hit.staleExp && hit.staleExp > now) return { ...hit, stale: true };
  if (hit.staleExp && hit.staleExp > now) return null; // behåll posten för ev. senare fallback
  g.__stockRouteCache.delete(symbol);
  return null;
}

function setCached(symbol, data, etag) {
  const now = Date.now();
  g.__stockRouteCache.set(symbol, {
    data,
    etag,
    exp: now + CACHE_TTL_MS,
    staleExp: now + CACHE_TTL_MS + STALE_IF_ERROR_MS,
  });
}

async function getKv() {
  if (g.__stockRouteKvClient !== null) return g.__stockRouteKvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const mod = await import("@vercel/kv");
      g.__stockRouteKvClient = mod.kv;
      return g.__stockRouteKvClient;
    } catch (err) {
      console.warn("[stock] kunde inte initiera KV:", err);
    }
  }
  g.__stockRouteKvClient = undefined;
  return g.__stockRouteKvClient;
}

async function getSharedCached(symbol, { allowStale = false } = {}) {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(`${SHARED_KEY_PREFIX}${symbol}`);
    if (!raw) return null;
    const hit = typeof raw === "string" ? JSON.parse(raw) : raw;
    const now = Date.now();
    if (hit.exp > now) return { ...hit, stale: false };
    if (allowStale && hit.staleExp && hit.staleExp > now) return { ...hit, stale: true };
    return null;
  } catch (err) {
    console.warn("[stock] hämtning från KV misslyckades:", err);
    return null;
  }
}

async function setSharedCached(symbol, data, etag) {
  const kv = await getKv();
  if (!kv) return;
  const now = Date.now();
  const entry = {
    data,
    etag,
    exp: now + SHARED_CACHE_TTL_MS,
    staleExp: now + SHARED_CACHE_TTL_MS + SHARED_STALE_MS,
  };
  try {
    await kv.set(`${SHARED_KEY_PREFIX}${symbol}`, entry, {
      ex: Math.ceil((SHARED_CACHE_TTL_MS + SHARED_STALE_MS) / 1000),
    });
  } catch (err) {
    console.warn("[stock] KV set misslyckades:", err);
  }
}

async function getSharedPauseUntil(symbol) {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const val = await kv.get(`${SHARED_PAUSE_KEY_PREFIX}${symbol}`);
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  } catch (err) {
    console.warn("[stock] KV pause get misslyckades:", err);
    return null;
  }
}

async function setSharedPauseUntil(symbol, untilTs) {
  const kv = await getKv();
  if (!kv) return;
  try {
    const ttlSec = Math.max(60, Math.ceil((untilTs - Date.now()) / 1000));
    await kv.set(`${SHARED_PAUSE_KEY_PREFIX}${symbol}`, untilTs, { ex: ttlSec });
  } catch (err) {
    console.warn("[stock] KV pause set misslyckades:", err);
  }
}

async function getSharedPauseFlag(symbol) {
  const kv = await getKv();
  if (!kv) return false;
  try {
    const val = await kv.get(`${SHARED_PAUSE_FLAG_PREFIX}${symbol}`);
    return Boolean(val);
  } catch (err) {
    console.warn("[stock] KV pause flag get misslyckades:", err);
    return false;
  }
}

async function setSharedPauseFlag(symbol, ttlMs = MANUAL_PAUSE_MS) {
  const kv = await getKv();
  if (!kv) return;
  try {
    const ttl = Math.max(60, Math.ceil(ttlMs / 1000));
    await kv.set(`${SHARED_PAUSE_FLAG_PREFIX}${symbol}`, 1, { ex: ttl });
  } catch (err) {
    console.warn("[stock] KV pause flag set misslyckades:", err);
  }
}

function respondFromCache(hit, request) {
  const inm = request.headers.get("if-none-match");
  if (inm && hit.etag && inm === hit.etag && !hit.stale) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: hit.etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }
  const headers = {
    ETag: hit.etag,
    "Cache-Control": CACHE_CONTROL,
    ...(hit.stale ? { Warning: '110 - "Serving stale stock data"' } : null),
  };
  const data = hit.stale ? { ...hit.data, stale: true } : hit.data;
  return NextResponse.json(data, {
    status: 200,
    headers,
  });
}

function normalizeError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const lower = message.toLowerCase();
  const rateLimited = lower.includes("too many requests") || lower.includes("429");
  return {
    message: rateLimited ? "Yahoo Finance rate limited the request" : message,
    status: rateLimited ? 429 : 502,
    rateLimited,
  };
}

function getState(symbol) {
  return g.__stockRouteState.get(symbol) || null;
}

function setState(symbol, patch) {
  const prev = g.__stockRouteState.get(symbol) || {};
  g.__stockRouteState.set(symbol, { ...prev, ...patch });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolRaw = searchParams.get("symbol") || "";
  const symbol = symbolRaw.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Stock symbol required" }, { status: 400 });
  }

  const cached = getCached(symbol);
  if (cached) {
    return respondFromCache(cached, request);
  }

  const sharedCached = await getSharedCached(symbol);
  if (sharedCached) {
    setCached(symbol, sharedCached.data, sharedCached.etag);
    return respondFromCache(sharedCached, request);
  }

  const state = getState(symbol);
  const nowTs = Date.now();

  const pauseApplied = await getSharedPauseFlag(symbol);
  const manualPauseUntil = pauseApplied ? null : (g.__stockManualPauseUntil ??= nowTs + MANUAL_PAUSE_MS);
  const sharedPauseUntil = await getSharedPauseUntil(symbol);
  const statePauseUntil = state?.pausedUntil;
  const activePauseUntil = [sharedPauseUntil, statePauseUntil, manualPauseUntil]
    .filter((v) => Number.isFinite(v) && v > nowTs)
    .reduce((max, v) => (max == null || v > max ? v : max), null);

  const tryServeStale = async () =>
    getCached(symbol, { allowStale: true }) ||
    sharedCached ||
    (await getSharedCached(symbol, { allowStale: true }));

  if (!pauseApplied && !sharedPauseUntil && Number.isFinite(manualPauseUntil) && manualPauseUntil > nowTs) {
    setState(symbol, { pausedUntil: manualPauseUntil });
    await Promise.all([
      setSharedPauseUntil(symbol, manualPauseUntil),
      setSharedPauseFlag(symbol, MANUAL_PAUSE_MS + 6 * 60 * 60 * 1000),
    ]);
  }

  if (!FETCH_ENABLED) {
    const stale = await tryServeStale();
    if (stale) {
      return respondFromCache({ ...stale, stale: true }, request);
    }
    return NextResponse.json(
      { error: "Upstream temporarily disabled, try again later" },
      { status: 503, headers: { "Retry-After": String(RETRY_AFTER_SECONDS) } }
    );
  }

  if (activePauseUntil) {
    const stale = await tryServeStale();
    if (stale) {
      return respondFromCache({ ...stale, stale: true }, request);
    }
    const retryAfter = Math.ceil((activePauseUntil - nowTs) / 1000);
    return NextResponse.json(
      { error: "Upstream temporarily paused to avoid rate limiting, try again later" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(retryAfter, RETRY_AFTER_SECONDS)) },
      }
    );
  }

  if (state?.nextAllowedAt && state.nextAllowedAt > nowTs) {
    const stale = await tryServeStale();
    if (stale) {
      return respondFromCache({ ...stale, stale: true }, request);
    }
    const retryAfter = Math.ceil((state.nextAllowedAt - nowTs) / 1000);
    return NextResponse.json(
      { error: "Upstream temporarily paused due to rate limiting, try again soon" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(retryAfter, RETRY_AFTER_SECONDS)) },
      }
    );
  }

  if (state?.inFlight) {
    try {
      const payload = await state.inFlight;
      return respondFromCache(
        { data: payload, etag: makeEtag(payload), stale: false },
        request
      );
    } catch (err) {
      // fall through to fresh attempt
    }
  }

  try {
    const now = new Date();
    const period1 = new Date(now.getFullYear(), 0, 1);

    const fetchPromise = (async () => {
      const quote = await yahooFinance.quote(symbol);
      if (!quote) {
        return NextResponse.json({ error: `No data found for symbol ${symbol}` }, { status: 404 });
      }

      const historicalRaw = await yahooFinance.historical(symbol, {
        period1,
        period2: now,
        interval: "1d",
      });

      if (!Array.isArray(historicalRaw) || historicalRaw.length === 0) {
        return NextResponse.json({ error: `No historical data found for symbol ${symbol}` }, { status: 404 });
      }

      const historicalData = historicalRaw
        .map((row) => {
          const date = row?.date ? new Date(row.date) : null;
          const close = Number(row?.close ?? row?.adjClose);
          if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(close)) return null;
          return { date, close };
        })
        .filter((row) => row && row.date >= period1 && row.date <= now)
        .sort((a, b) => a.date - b.date);

      if (!historicalData.length) {
        return NextResponse.json({ error: "Could not find start of year price" }, { status: 404 });
      }

      const startOfYearPrice = historicalData[0]?.close;
      const currentPrice = Number(quote?.regularMarketPrice);

      const ytdChangePercent =
        Number.isFinite(currentPrice) && Number.isFinite(startOfYearPrice) && startOfYearPrice !== 0
          ? ((currentPrice - startOfYearPrice) / startOfYearPrice) * 100
          : null;

      let gains = 0;
      let losses = 0;
      for (let i = 1; i < historicalData.length; i++) {
        const previousClose = historicalData[i - 1]?.close;
        const currentClose = historicalData[i]?.close;
        if (!Number.isFinite(previousClose) || !Number.isFinite(currentClose)) continue;
        const delta = currentClose - previousClose;
        if (delta > 0) gains += 1;
        else if (delta < 0) losses += 1;
      }

      return {
        price: {
          regularMarketPrice: {
            raw: Number.isFinite(currentPrice) ? currentPrice : null,
          },
          regularMarketChangePercent: {
            raw: Number.isFinite(quote?.regularMarketChangePercent)
              ? Number(quote.regularMarketChangePercent)
              : null,
          },
        },
        marketCap: Number.isFinite(quote?.marketCap) ? Number(quote.marketCap) : null,
        ytdChangePercent,
        daysWithGains: gains,
        daysWithLosses: losses,
        generatedAt: now.toISOString(),
      };
    })();

    setState(symbol, { inFlight: fetchPromise });
    const payload = await fetchPromise;
    setState(symbol, { inFlight: null, nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS });

    const etag = makeEtag(payload);
    setCached(symbol, payload, etag);
    await setSharedCached(symbol, payload, etag);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    const { status, message, rateLimited } = normalizeError(error);
    if (rateLimited) {
      setState(symbol, { nextAllowedAt: Date.now() + RATE_LIMIT_COOLDOWN_MS, inFlight: null });
    } else {
      setState(symbol, { nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS, inFlight: null });
    }
    const stale =
      getCached(symbol, { allowStale: true }) ||
      (await getSharedCached(symbol, { allowStale: true }));
    if (stale) {
      return respondFromCache({ ...stale, stale: true }, request);
    }

    const headers = {
      "Cache-Control": "no-store",
      ...(rateLimited ? { "Retry-After": String(RETRY_AFTER_SECONDS) } : null),
    };

    return NextResponse.json({ error: message }, { status, headers });
  }
}
