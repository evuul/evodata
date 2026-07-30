// Shares validated stock-quote and FX resources across client consumers.

import { createClientJsonResource } from "./clientJsonResource.js";

const STOCK_CACHE_MS = 2 * 60 * 1000;
const FX_CACHE_MS = 60 * 60 * 1000;
const RESOURCE_TIMEOUT_MS = 8_000;
const STOCK_SYMBOL_PATTERN = /^[A-Z0-9.^=_-]{1,24}$/;

const toPositiveNumber = (value) => {
  const parsed = Number(value?.raw ?? value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value?.raw ?? value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function normalizeStockSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!STOCK_SYMBOL_PATTERN.test(normalized)) {
    throw new Error("A valid stock symbol is required");
  }
  return normalized;
}

export function buildStockQuoteUrl(symbol) {
  return `/api/stock?symbol=${encodeURIComponent(normalizeStockSymbol(symbol))}&v=v5`;
}

export function normalizeStockQuotePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid stock quote payload");
  }

  const price = toPositiveNumber(payload?.price?.regularMarketPrice);
  if (price === null) throw new Error("Stock quote is missing a valid price");

  return {
    ...payload,
    price: {
      ...payload.price,
      regularMarketPrice: { raw: price },
    },
    marketCap: toPositiveNumber(payload.marketCap),
    ytdChangePercent: toFiniteNumber(payload.ytdChangePercent),
    daysWithGains: toFiniteNumber(payload.daysWithGains),
    daysWithLosses: toFiniteNumber(payload.daysWithLosses),
  };
}

export function normalizeFxPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid FX payload");
  }

  const rate = toPositiveNumber(payload.rate);
  if (rate === null) throw new Error("FX payload is missing a valid rate");

  return {
    ...payload,
    base: String(payload.base || "EUR").trim().toUpperCase(),
    quote: String(payload.quote || "SEK").trim().toUpperCase(),
    rate,
    source: String(payload.source || "unknown").trim() || "unknown",
  };
}

export function shouldPersistFxPayload(payload) {
  const normalized = normalizeFxPayload({
    ...payload,
    source: payload?.source ?? payload?.meta?.source,
  });
  return normalized.source.toLowerCase() !== "fallback";
}

async function loadResource(resource, { force = false } = {}) {
  const before = resource.getSnapshot();
  try {
    const data = await (force ? resource.refresh() : resource.load());
    const after = resource.getSnapshot();
    const source = String(data?.source || "").toLowerCase();
    const status = source === "fallback"
      ? "fallback"
      : data?.stale === true
        ? "stale"
        : before.data !== null && before.updatedAt === after.updatedAt
          ? "cache"
          : "live";
    return { data, status, error: null, updatedAt: after.updatedAt };
  } catch (error) {
    const snapshot = resource.getSnapshot();
    if (snapshot.data !== null) {
      return {
        data: snapshot.data,
        status: "stale",
        error: error instanceof Error ? error : new Error(String(error)),
        updatedAt: snapshot.updatedAt,
      };
    }
    throw error;
  }
}

export function createQuoteFxClient({
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  sleep,
} = {}) {
  const stockResources = new Map();
  const resourceOptions = { fetchImpl, now, ...(sleep ? { sleep } : null) };
  const fxResource = createClientJsonResource({
    ...resourceOptions,
    url: "/api/fx",
    cacheMs: FX_CACHE_MS,
    timeoutMs: RESOURCE_TIMEOUT_MS,
    retries: 1,
    transform: normalizeFxPayload,
  });

  const getStockResource = (symbol) => {
    const key = normalizeStockSymbol(symbol);
    if (!stockResources.has(key)) {
      stockResources.set(key, createClientJsonResource({
        ...resourceOptions,
        url: buildStockQuoteUrl(key),
        cacheMs: STOCK_CACHE_MS,
        timeoutMs: RESOURCE_TIMEOUT_MS,
        retries: 1,
        transform: normalizeStockQuotePayload,
      }));
    }
    return stockResources.get(key);
  };

  return {
    fetchStockQuote: (symbol, options) => loadResource(getStockResource(symbol), options),
    fetchFxRate: (options) => loadResource(fxResource, options),
  };
}

const sharedClient = createQuoteFxClient();

export const fetchStockQuoteShared = (symbol, options) => sharedClient.fetchStockQuote(symbol, options);
export const fetchFxRateShared = (options) => sharedClient.fetchFxRate(options);
