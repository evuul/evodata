// Verifies safe transaction-ledger edits and deterministic portfolio rebuilding.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEditableTransactionLedger,
  deletePortfolioTransaction,
  normalizePortfolioTransactions,
  rebuildPortfolioFromTransactions,
  updatePortfolioTransaction,
} from "./portfolioTransactions.js";

const transactions = normalizePortfolioTransactions([
  { type: "buy", date: "2024-01-10", shares: 10, price: 100, fee: 10 },
  { type: "buy", date: "2024-02-10", shares: 5, price: 120, fee: 0 },
  { type: "sell", date: "2024-03-10", shares: 3, price: 130, fee: 5 },
]);

test("assigns stable unique transaction ids and preserves existing ids", () => {
  const normalizedAgain = normalizePortfolioTransactions(transactions);
  assert.deepEqual(normalizedAgain.map((transaction) => transaction.id), ["tx_1", "tx_2", "tx_3"]);
});

test("rebuilds FIFO holdings and includes brokerage in the remaining cost basis", () => {
  const result = rebuildPortfolioFromTransactions(transactions);
  assert.equal(result.ok, true);
  assert.equal(result.profile.shares, 12);
  assert.equal(result.profile.lots[0].shares, 7);
  assert.equal(result.profile.avgCost, (7 * 101 + 5 * 120) / 12);
});

test("updates one transaction and previews the recalculated portfolio", () => {
  const result = updatePortfolioTransaction(transactions, "tx_2", {
    date: "2024-02-10",
    shares: 8,
    price: 110,
    fee: 8,
  });
  assert.equal(result.ok, true);
  assert.equal(result.profile.shares, 15);
  assert.equal(result.profile.transactions.find((transaction) => transaction.id === "tx_2").shares, 8);
});

test("rejects an edit that would sell more shares than were held", () => {
  const result = updatePortfolioTransaction(transactions, "tx_3", {
    date: "2024-03-10",
    shares: 16,
    price: 130,
    fee: 5,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /överskrider innehavet/);
});

test("deletes a transaction and recalculates the remaining portfolio", () => {
  const result = deletePortfolioTransaction(transactions, "tx_3");
  assert.equal(result.ok, true);
  assert.equal(result.profile.shares, 15);
  assert.equal(result.profile.transactions.length, 2);
});

test("rejects invalid calendar dates and oversized values", () => {
  assert.equal(rebuildPortfolioFromTransactions([
    { type: "buy", date: "2024-02-31", shares: 10, price: 100 },
  ]).ok, false);
  assert.equal(rebuildPortfolioFromTransactions([
    { type: "buy", date: "2024-02-10", shares: 1_000_000_001, price: 100 },
  ]).ok, false);
  assert.equal(rebuildPortfolioFromTransactions([
    { type: "buy", date: "2024-02-10", shares: -10, price: 100 },
  ]).ok, false);
  assert.equal(rebuildPortfolioFromTransactions([
    { type: "buy", date: "2024-02-10", shares: 10, price: 100, fee: -1 },
  ]).ok, false);
});

test("repairs an incomplete legacy ledger from the current lots", () => {
  const ledger = buildEditableTransactionLedger({
    shares: 15,
    avgCost: 110,
    lots: [
      { date: "2024-01-10", shares: 10, price: 100 },
      { date: "2024-02-10", shares: 5, price: 130 },
    ],
    transactions: [{ type: "buy", date: "2024-02-10", shares: 5, price: 130 }],
  });
  assert.equal(ledger.length, 2);
  assert.equal(ledger.reduce((sum, transaction) => sum + transaction.shares, 0), 15);
});
