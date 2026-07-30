// Regression tests for selecting a same-day Stockholm market opening candle.

import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMarketSessionBoundary,
  findIntradayMarketOpen,
  getStockholmMarketSessionPhase,
  isMarketSessionCacheCompatible,
} from "./stockMarketSession.js";

test("uses the first valid 09:00 Stockholm candle from today's intraday data", () => {
  const openingPrice = findIntradayMarketOpen({
    referenceDate: new Date("2026-07-29T08:05:00.000Z"),
    timestamps: [
      Date.parse("2026-07-28T15:29:00.000Z") / 1000,
      Date.parse("2026-07-29T06:59:00.000Z") / 1000,
      Date.parse("2026-07-29T07:00:00.000Z") / 1000,
      Date.parse("2026-07-29T07:01:00.000Z") / 1000,
    ],
    opens: [718.8, 720, 748.4, 749],
  });

  assert.equal(openingPrice, 748.4);
});

test("returns null when today's regular session candle is unavailable", () => {
  assert.equal(
    findIntradayMarketOpen({
      referenceDate: new Date("2026-07-29T08:05:00.000Z"),
      timestamps: [Date.parse("2026-07-29T06:59:00.000Z") / 1000],
      opens: [748.4],
    }),
    null
  );
});

test("resets the previous session movement at 07:00 Stockholm time", () => {
  const beforeReset = new Date("2026-07-30T04:59:00.000Z"); // 06:59 CEST
  const atReset = new Date("2026-07-30T05:00:00.000Z"); // 07:00 CEST

  assert.equal(getStockholmMarketSessionPhase(beforeReset), "previous-session");
  assert.equal(getStockholmMarketSessionPhase(atReset), "pre-open");
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 1.25,
      marketOpen: 742,
      generatedAt: "2026-07-29T15:30:00.000Z",
      now: atReset,
    }),
    { phase: "pre-open", changePercent: 0, marketOpen: null }
  );
});

test("requires a same-day opening price once the market opens", () => {
  const marketOpen = new Date("2026-07-30T07:00:00.000Z"); // 09:00 CEST

  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 1.25,
      marketOpen: 742,
      generatedAt: "2026-07-29T15:30:00.000Z",
      now: marketOpen,
    }),
    { phase: "open", changePercent: null, marketOpen: null }
  );
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 0.5,
      marketOpen: 750,
      generatedAt: "2026-07-30T07:01:00.000Z",
      now: new Date("2026-07-30T07:01:00.000Z"),
    }),
    { phase: "open", changePercent: 0.5, marketOpen: 750 }
  );
});

test("invalidates cached quotes across the 07:00 and 09:00 boundaries", () => {
  assert.equal(
    isMarketSessionCacheCompatible(
      { marketSessionPhase: "previous-session" },
      new Date("2026-07-30T05:00:00.000Z")
    ),
    false
  );
  assert.equal(
    isMarketSessionCacheCompatible(
      { marketSessionPhase: "pre-open" },
      new Date("2026-07-30T06:30:00.000Z")
    ),
    true
  );
  assert.equal(
    isMarketSessionCacheCompatible(
      { marketSessionPhase: "pre-open" },
      new Date("2026-07-30T07:00:00.000Z")
    ),
    false
  );
});
