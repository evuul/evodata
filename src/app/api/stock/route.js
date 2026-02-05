import { NextResponse } from "next/server";
import yahooFinance, { withYahooThrottle } from "@/lib/yahooFinanceClient";
import { totalSharesData } from "@/Components/buybacks/utils";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const OPEN_CACHE_TTL_MS = 60 * 1000; // 1 min under öppet
const CLOSED_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min när stängt
const STALE_IF_ERROR_MS = 10 * 60 * 1000; // 10 minuters fallback om upstream dör
const RETRY_AFTER_SECONDS = 120;
const OPEN_SHARED_CACHE_TTL_MS = 2 * 60 * 1000; // delad cache (KV) 2 min under öppet
const CLOSED_SHARED_CACHE_TTL_MS = 15 * 60 * 1000; // delad cache (KV) 15 min när stängt
const SHARED_STALE_MS = 60 * 60 * 1000; // få chans att svara med gammalt istället för 500 (1h)
const SHARED_KEY_PREFIX = "stock:quote:";
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000; // slå inte Yahoo tätare än 2 min
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // vid 429: vila 10 min

const g = globalThis;
g.__stockRouteCache ??= new Map();
g.__stockRouteKvClient ??= null;
g.__stockRouteState ??= new Map(); // symbol -> { inFlight, nextAllowedAt }

function isMarketOpenStockholm(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase();
    const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");
    const isWeekday =
      weekday.startsWith("mån") ||
      weekday.startsWith("tis") ||
      weekday.startsWith("ons") ||
      weekday.startsWith("tor") ||
      weekday.startsWith("fre");
    if (!isWeekday) return false;
    const afterOpen = hour > 9 || (hour === 9 && minute >= 0);
    const beforeClose = hour < 17 || (hour === 17 && minute <= 30);
    return afterOpen && beforeClose;
  } catch {
    return false;
  }
}

function getCachePolicy() {
  const open = isMarketOpenStockholm();
  const sMaxAge = open ? 60 : 600;
  const swr = open ? 120 : 3600;
  return {
    cacheControl: `public, max-age=${sMaxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    inProcessTtlMs: open ? OPEN_CACHE_TTL_MS : CLOSED_CACHE_TTL_MS,
    sharedTtlMs: open ? OPEN_SHARED_CACHE_TTL_MS : CLOSED_SHARED_CACHE_TTL_MS,
  };
}

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
  const { inProcessTtlMs } = getCachePolicy();
  g.__stockRouteCache.set(symbol, {
    data,
    etag,
    exp: now + inProcessTtlMs,
    staleExp: now + inProcessTtlMs + STALE_IF_ERROR_MS,
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
  const { sharedTtlMs } = getCachePolicy();
  const entry = {
    data,
    etag,
    exp: now + sharedTtlMs,
    staleExp: now + sharedTtlMs + SHARED_STALE_MS,
  };
  try {
    await kv.set(`${SHARED_KEY_PREFIX}${symbol}`, entry, {
      ex: Math.ceil((sharedTtlMs + SHARED_STALE_MS) / 1000),
    });
  } catch (err) {
    console.warn("[stock] KV set misslyckades:", err);
  }
}

function respondFromCache(hit, request) {
  const inm = request.headers.get("if-none-match");
  if (inm && hit.etag && inm === hit.etag && !hit.stale) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: hit.etag,
        "Cache-Control": getCachePolicy().cacheControl,
      },
    });
  }
  const headers = {
    ETag: hit.etag,
    "Cache-Control": getCachePolicy().cacheControl,
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

function buildPayload({
  currentPrice,
  changePercent,
  historicalData,
  now,
  source = null,
}) {
  if (!historicalData.length) {
    throw new Error("Could not find start of year price");
  }

  const startOfYearPrice = historicalData[0]?.close;
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

  const totalSharesOutstanding = getLatestTotalShares();
  const marketCap =
    Number.isFinite(currentPrice) && Number.isFinite(totalSharesOutstanding)
      ? currentPrice * totalSharesOutstanding
      : null;

  return {
    price: {
      regularMarketPrice: {
        raw: Number.isFinite(currentPrice) ? currentPrice : null,
      },
      regularMarketChangePercent: {
        raw: Number.isFinite(changePercent) ? changePercent : null,
      },
    },
    marketCap,
    ytdChangePercent,
    daysWithGains: gains,
    daysWithLosses: losses,
    generatedAt: now.toISOString(),
    ...(source ? { source } : null),
  };
}

function getLatestTotalShares() {
  if (!Array.isArray(totalSharesData) || !totalSharesData.length) return null;
  const latest = totalSharesData[totalSharesData.length - 1]?.totalShares;
  return Number.isFinite(latest) ? latest : null;
}

async function fetchStooqDaily(symbol) {
  const stooqSymbol = symbol.toLowerCase();
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Stooq request failed: ${response.status}`);
  }
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("Stooq returned no data");
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 6) continue;
    const date = new Date(parts[0]);
    const close = Number(parts[4]);
    if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(close)) continue;
    rows.push({ date, close });
  }
  if (!rows.length) {
    throw new Error("Stooq returned empty price series");
  }
  rows.sort((a, b) => a.date - b.date);
  return rows;
}

async function fetchYahooChartDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Yahoo chart request failed: ${response.status}`);
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closes = Array.isArray(result?.indicators?.quote?.[0]?.close)
    ? result.indicators.quote[0].close
    : [];
  if (!timestamps.length || !closes.length) {
    throw new Error("Yahoo chart returned no data");
  }
  const rows = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = closes[i];
    const date = new Date(ts * 1000);
    if (!Number.isFinite(close) || Number.isNaN(date.getTime())) continue;
    rows.push({ date, close: Number(close) });
  }
  if (!rows.length) {
    throw new Error("Yahoo chart returned empty price series");
  }
  rows.sort((a, b) => a.date - b.date);
  const latest = rows[rows.length - 1];
  const currentPrice = Number.isFinite(result?.meta?.regularMarketPrice)
    ? Number(result.meta.regularMarketPrice)
    : latest?.close ?? null;
  let changePercent = null;
  if (rows.length >= 2) {
    const prev = rows[rows.length - 2];
    if (Number.isFinite(prev?.close) && prev.close !== 0 && Number.isFinite(latest?.close)) {
      changePercent = ((latest.close - prev.close) / prev.close) * 100;
    }
  }
  return { rows, currentPrice, changePercent };
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
  if (state?.nextAllowedAt && state.nextAllowedAt > nowTs) {
    const stale =
      getCached(symbol, { allowStale: true }) ||
      sharedCached ||
      (await getSharedCached(symbol, { allowStale: true }));
    if (stale) {
      return respondFromCache({ ...stale, stale: true }, request);
    }
    try {
      const now = new Date();
      const period1 = new Date(now.getFullYear(), 0, 1);
      let source = "stooq";
      let rows = [];
      let currentPrice = null;
      let changePercent = null;
      try {
        rows = await fetchStooqDaily(symbol);
        const latest = rows[rows.length - 1];
        currentPrice = Number.isFinite(latest?.close) ? latest.close : null;
        if (rows.length >= 2) {
          const prev = rows[rows.length - 2];
          if (Number.isFinite(prev?.close) && prev.close !== 0 && Number.isFinite(latest?.close)) {
            changePercent = ((latest.close - prev.close) / prev.close) * 100;
          }
        }
      } catch {
        const chart = await fetchYahooChartDaily(symbol);
        rows = chart.rows;
        currentPrice = chart.currentPrice;
        changePercent = chart.changePercent;
        source = "yahoo-chart";
      }
      const historicalData = rows.filter((row) => row.date >= period1 && row.date <= now);
      const payload = buildPayload({
        currentPrice,
        changePercent,
        historicalData,
        now,
        source,
      });
      const etag = makeEtag(payload);
      setCached(symbol, payload, etag);
      await setSharedCached(symbol, payload, etag);
      return NextResponse.json(payload, {
        status: 200,
        headers: {
          ETag: etag,
          "Cache-Control": getCachePolicy().cacheControl,
        },
      });
    } catch {
      // fall through to 429
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
      const inFlightResult = await state.inFlight;
      const payload = inFlightResult?.payload ?? inFlightResult;
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
      let source = null;
      let yahooRateLimited = false;

      let currentPrice = null;
      let changePercent = null;
      let historicalData = [];

      try {
        const quote = await withYahooThrottle(() => yahooFinance.quote(symbol));
        if (!quote) {
          throw new Error(`No data found for symbol ${symbol}`);
        }
        const historicalRaw = await withYahooThrottle(() =>
          yahooFinance.historical(symbol, {
            period1,
            period2: now,
            interval: "1d",
          })
        );
        if (!Array.isArray(historicalRaw) || historicalRaw.length === 0) {
          throw new Error(`No historical data found for symbol ${symbol}`);
        }
        historicalData = historicalRaw
          .map((row) => {
            const date = row?.date ? new Date(row.date) : null;
            const close = Number(row?.close ?? row?.adjClose);
            if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(close)) return null;
            return { date, close };
          })
          .filter((row) => row && row.date >= period1 && row.date <= now)
          .sort((a, b) => a.date - b.date);
        currentPrice = Number(quote?.regularMarketPrice);
        changePercent = Number.isFinite(quote?.regularMarketChangePercent)
          ? Number(quote.regularMarketChangePercent)
          : null;
      } catch (err) {
        const normalized = normalizeError(err);
        yahooRateLimited = normalized.rateLimited;
        try {
          const rows = await fetchStooqDaily(symbol);
          historicalData = rows.filter((row) => row.date >= period1 && row.date <= now);
          const latest = rows[rows.length - 1];
          currentPrice = Number.isFinite(latest?.close) ? latest.close : null;
          if (rows.length >= 2) {
            const prev = rows[rows.length - 2];
            if (Number.isFinite(prev?.close) && prev.close !== 0 && Number.isFinite(latest?.close)) {
              changePercent = ((latest.close - prev.close) / prev.close) * 100;
            }
          }
          source = "stooq";
        } catch (stooqErr) {
          const chart = await fetchYahooChartDaily(symbol);
          historicalData = chart.rows.filter((row) => row.date >= period1 && row.date <= now);
          currentPrice = chart.currentPrice;
          changePercent = chart.changePercent;
          source = "yahoo-chart";
        }
      }

      return {
        payload: buildPayload({
          currentPrice,
          changePercent,
          historicalData,
          now,
          source,
        }),
        yahooRateLimited,
      };
    })();

    setState(symbol, { inFlight: fetchPromise });
    const { payload, yahooRateLimited } = await fetchPromise;
    const nextWait = yahooRateLimited ? RATE_LIMIT_COOLDOWN_MS : MIN_FETCH_INTERVAL_MS;
    setState(symbol, { inFlight: null, nextAllowedAt: Date.now() + nextWait });

    const etag = makeEtag(payload);
    setCached(symbol, payload, etag);
    await setSharedCached(symbol, payload, etag);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": getCachePolicy().cacheControl,
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
