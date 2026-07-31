// Regression tests for selecting a same-day Stockholm market opening candle.

import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMarketSessionBoundary,
  getStockholmMarketSessionPhase,
  isMarketSessionCacheCompatible,
} from "./stockMarketSession.js";

test("resets the previous session movement at 07:00 Stockholm time", () => {
  const beforeReset = new Date("2026-07-30T04:59:00.000Z"); // 06:59 CEST
  const atReset = new Date("2026-07-30T05:00:00.000Z"); // 07:00 CEST

  assert.equal(getStockholmMarketSessionPhase(beforeReset), "previous-session");
  assert.equal(getStockholmMarketSessionPhase(atReset), "pre-open");
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 1.25,
      marketOpen: 742,
      previousClose: 737.2,
      generatedAt: "2026-07-29T15:30:00.000Z",
      now: atReset,
    }),
    { phase: "pre-open", changePercent: 0, marketOpen: null }
  );
});

test("requires a same-day quote and previous close once the market opens", () => {
  const marketOpen = new Date("2026-07-30T07:00:00.000Z"); // 09:00 CEST

  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 1.25,
      marketOpen: 742,
      previousClose: 737.2,
      generatedAt: "2026-07-29T15:30:00.000Z",
      now: marketOpen,
    }),
    { phase: "open", changePercent: null, marketOpen: 742 }
  );
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 0.5,
      marketOpen: 750,
      previousClose: null,
      generatedAt: "2026-07-30T07:01:00.000Z",
      now: new Date("2026-07-30T07:01:00.000Z"),
    }),
    { phase: "open", changePercent: null, marketOpen: 750 }
  );
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: 0.5,
      marketOpen: null,
      previousClose: 737.2,
      generatedAt: "2026-07-30T07:01:00.000Z",
      now: new Date("2026-07-30T07:01:00.000Z"),
    }),
    { phase: "open", changePercent: 0.5, marketOpen: null }
  );
  assert.deepEqual(
    applyMarketSessionBoundary({
      changePercent: null,
      marketOpen: 750,
      previousClose: 737.2,
      generatedAt: "2026-07-30T07:01:00.000Z",
      now: new Date("2026-07-30T07:01:00.000Z"),
    }),
    { phase: "open", changePercent: null, marketOpen: 750 }
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
