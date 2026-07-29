// Regression tests for selecting a same-day Stockholm market opening candle.

import assert from "node:assert/strict";
import test from "node:test";

import { findIntradayMarketOpen } from "./stockMarketSession.js";

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
