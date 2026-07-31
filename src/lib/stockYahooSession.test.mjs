// Verifies Yahoo one-day session metadata used for the daily stock move.

import assert from "node:assert/strict";
import test from "node:test";

import { normalizeYahooSessionQuote } from "./stockYahooSession.js";

test("uses one-day chart metadata for the previous close", () => {
  const quote = normalizeYahooSessionQuote({
    chart: {
      result: [{
        meta: {
          regularMarketPrice: 733.4,
          regularMarketTime: 1_785_484_564,
          chartPreviousClose: 737.2,
        },
        indicators: {
          quote: [{ open: [734] }],
        },
      }],
    },
  });

  assert.deepEqual(quote, {
    currentPrice: 733.4,
    previousClose: 737.2,
    marketOpen: 734,
    quoteTime: new Date("2026-07-31T07:56:04.000Z"),
  });
});

test("fails safely when Yahoo session metadata is malformed", () => {
  assert.deepEqual(normalizeYahooSessionQuote({ chart: { result: [] } }), {
    currentPrice: null,
    previousClose: null,
    marketOpen: null,
    quoteTime: null,
  });
});
