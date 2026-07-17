// Regression tests for stock quote change calculations across session boundaries.

import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDailyCloseChangePercent,
  calculateQuoteChangePercent,
} from "./stockPriceChange.js";

function assertApproximatelyEqual(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `Expected ${actual} to be approximately ${expected}`);
}

test("quote change uses the latest close when today's daily candle is missing", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 694,
    quoteTime: new Date("2026-07-16T08:30:00.000Z"),
    dailyRows: [
      { date: new Date("2026-07-14T07:00:00.000Z"), close: 698.8 },
      { date: new Date("2026-07-15T07:00:00.000Z"), close: 703 },
    ],
  });

  assertApproximatelyEqual(changePercent, -1.2802275960170697);
});

test("quote change prefers explicit previous close over a stale daily series", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 688.8,
    previousClose: 689.6,
    quoteTime: new Date("2026-07-17T08:08:00.000Z"),
    dailyRows: [
      { date: new Date("2026-07-14T07:00:00.000Z"), close: 698.8 },
      { date: new Date("2026-07-15T07:00:00.000Z"), close: 703 },
    ],
  });

  assertApproximatelyEqual(changePercent, -0.11600928074246586);
});

test("quote change rejects a stale daily series without an explicit previous close", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 683.8,
    quoteTime: new Date("2026-07-17T08:24:00.000Z"),
    dailyRows: [
      { date: new Date("2026-07-14T07:00:00.000Z"), close: 698.8 },
      { date: new Date("2026-07-15T07:00:00.000Z"), close: 703 },
    ],
  });

  assert.equal(changePercent, null);
});

test("quote change accepts the previous Friday close on a Monday", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 700,
    quoteTime: new Date("2026-07-20T08:30:00.000Z"),
    dailyRows: [{ date: new Date("2026-07-17T07:00:00.000Z"), close: 690 }],
  });

  assertApproximatelyEqual(changePercent, 1.4492753623188406);
});

test("quote change skips today's candle when it is already in the daily series", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 693.2,
    quoteTime: new Date("2026-07-16T10:00:00.000Z"),
    dailyRows: [
      { date: new Date("2026-07-15T07:00:00.000Z"), close: 703 },
      { date: new Date("2026-07-16T07:00:00.000Z"), close: 693.2 },
    ],
  });

  assertApproximatelyEqual(changePercent, -1.3940256045519213);
});

test("quote change keeps the last completed session change after the market closes", () => {
  const changePercent = calculateQuoteChangePercent({
    currentPrice: 703,
    quoteTime: new Date("2026-07-15T15:30:00.000Z"),
    dailyRows: [
      { date: new Date("2026-07-14T07:00:00.000Z"), close: 698.8 },
      { date: new Date("2026-07-15T07:00:00.000Z"), close: 703 },
    ],
  });

  assertApproximatelyEqual(changePercent, 0.6010303377229363);
});

test("daily close change handles unsorted rows and invalid input", () => {
  assertApproximatelyEqual(
    calculateDailyCloseChangePercent([
      { date: "2026-07-15T07:00:00.000Z", close: 703 },
      { date: "2026-07-14T07:00:00.000Z", close: 698.8 },
    ]),
    0.6010303377229363
  );
  assert.equal(calculateQuoteChangePercent({ currentPrice: null, dailyRows: [] }), null);
  assert.equal(calculateDailyCloseChangePercent([{ date: "invalid", close: 703 }]), null);
});
