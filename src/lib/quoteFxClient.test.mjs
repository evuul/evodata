// Verifies quote and FX validation, request sharing, and stale-data recovery.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStockQuoteUrl,
  createQuoteFxClient,
  normalizeFxPayload,
  normalizeStockQuotePayload,
  shouldPersistFxPayload,
} from "./quoteFxClient.js";

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

test("builds a normalized and encoded stock URL", () => {
  assert.equal(buildStockQuoteUrl(" evo.st "), "/api/stock?symbol=EVO.ST&v=v5");
  assert.throws(() => buildStockQuoteUrl("EVO ST"), /valid stock symbol/);
});

test("normalizes quote numbers while preserving the response contract", () => {
  const result = normalizeStockQuotePayload({
    price: { regularMarketPrice: { raw: "812.50" }, regularMarketOpen: 800 },
    marketCap: "170000000000",
    ytdChangePercent: "4.2",
    daysWithGains: 80,
    daysWithLosses: 70,
  });

  assert.equal(result.price.regularMarketPrice.raw, 812.5);
  assert.equal(result.price.regularMarketOpen, 800);
  assert.equal(result.marketCap, 170_000_000_000);
  assert.throws(
    () => normalizeStockQuotePayload({ price: { regularMarketPrice: null } }),
    /valid price/
  );
});

test("rejects invalid FX rates and never persists provider fallback values", () => {
  assert.equal(normalizeFxPayload({ rate: "11.25", source: "ECB" }).rate, 11.25);
  assert.equal(shouldPersistFxPayload({ rate: 11.25, source: "fallback" }), false);
  assert.equal(shouldPersistFxPayload({ rate: 11.25, meta: { source: "fallback" } }), false);
  assert.equal(shouldPersistFxPayload({ rate: 11.25, source: "ECB" }), true);
  assert.throws(() => normalizeFxPayload({ rate: 0 }), /valid rate/);
});

test("deduplicates quote requests and reports cached delivery", async () => {
  let calls = 0;
  const client = createQuoteFxClient({
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ price: { regularMarketPrice: { raw: 800 } } });
    },
  });

  const [first, second] = await Promise.all([
    client.fetchStockQuote("EVO.ST"),
    client.fetchStockQuote("evo.st"),
  ]);
  const cached = await client.fetchStockQuote("EVO.ST");

  assert.equal(first.status, "live");
  assert.equal(second.data.price.regularMarketPrice.raw, 800);
  assert.equal(cached.status, "cache");
  assert.equal(calls, 1);
});

test("returns the last valid FX rate as stale when refresh fails", async () => {
  let offline = false;
  const client = createQuoteFxClient({
    sleep: async () => {},
    fetchImpl: async () => {
      if (offline) throw new Error("offline");
      return jsonResponse({ rate: 11.18, base: "EUR", quote: "SEK", source: "ECB" });
    },
  });

  await client.fetchFxRate();
  offline = true;
  const result = await client.fetchFxRate({ force: true });

  assert.equal(result.data.rate, 11.18);
  assert.equal(result.status, "stale");
  assert.match(result.error.message, /offline/);
});

test("does not cache malformed quote responses as valid stale data", async () => {
  const client = createQuoteFxClient({
    sleep: async () => {},
    fetchImpl: async () => jsonResponse({ price: { regularMarketPrice: { raw: null } } }),
  });

  await assert.rejects(client.fetchStockQuote("EVO.ST"), /valid price/);
});
