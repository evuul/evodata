// Regression tests for portfolio profile normalization.
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePortfolioProfile } from "./portfolioProfile.js";

test("keeps a new registration profile valid without transactions", () => {
  const profile = normalizePortfolioProfile({
    shares: 0,
    avgCost: 0,
    acquisitionDate: null,
    lots: [],
    updatedAt: "2026-06-10T09:30:00.000Z",
  });

  assert.deepEqual(profile.lots, []);
  assert.deepEqual(profile.transactions, []);
  assert.equal(profile.shares, 0);
  assert.equal(profile.avgCost, 0);
  assert.equal(profile.acquisitionDate, null);
});

test("normalizes holdings from persisted lots when shares are missing", () => {
  const profile = normalizePortfolioProfile({
    shares: 0,
    avgCost: 0,
    acquisitionDate: null,
    lots: [
      { shares: "40", price: "10", date: "2024-01-10" },
      { shares: 60, price: 20, date: "2024-02-10" },
    ],
    transactions: [],
  });

  assert.equal(profile.shares, 100);
  assert.equal(profile.avgCost, 16);
  assert.equal(profile.acquisitionDate, "2024-01-10");
  assert.equal(profile.lots.length, 2);
});

test("rebuilds holdings from transactions when lots are absent", () => {
  const profile = normalizePortfolioProfile({
    shares: 0,
    avgCost: 0,
    acquisitionDate: null,
    lots: [],
    transactions: [
      { type: "buy", shares: 10, price: 100, date: "2024-01-10" },
      { type: "buy", shares: 5, price: 120, date: "2024-02-10" },
      { type: "sell", shares: 3, price: 130, date: "2024-03-10" },
    ],
  });

  assert.equal(profile.shares, 12);
  assert.equal(Number(profile.avgCost.toFixed(10)), Number((1300 / 12).toFixed(10)));
  assert.equal(profile.acquisitionDate, "2024-01-10");
  assert.equal(profile.lots.length, 2);
  assert.deepEqual(
    profile.lots.map((lot) => ({ shares: lot.shares, price: lot.price, date: lot.date })),
    [
      { shares: 7, price: 100, date: "2024-01-10" },
      { shares: 5, price: 120, date: "2024-02-10" },
    ]
  );
});
