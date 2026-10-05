// Verifies registered capital, treasury shares and net shares after the September cancellation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shareCapitalChanges, treasuryShareSnapshots } from "../app/data/shareCapital.js";
import { calculateCancelledShares, getTotalSharesForDate, totalSharesData } from "../Components/buybacks/utils.js";
import { calculateTreasuryShares, getShareCancellations } from "./buybackMandate.js";

const readData = (name) => JSON.parse(readFileSync(new URL(`../app/data/${name}.json`, import.meta.url), "utf8"));
const buybacks = readData("buybackData");
const change = shareCapitalChanges.at(-1);

test("September cancellation reconciles with registered shares and votes", () => {
  assert.deepEqual(change, {
    date: "2026-09-30",
    previousTotalShares: 199_226_613,
    totalShares: 183_058_121,
    cancelledShares: 16_168_492,
  });
  assert.equal(change.previousTotalShares - change.cancelledShares, change.totalShares);
  assert.equal(totalSharesData.at(-1).totalShares, change.totalShares);
});

test("dated share counts preserve historical short and dividend calculations", () => {
  assert.equal(getTotalSharesForDate("2026-09-29"), 199_226_613);
  assert.equal(getTotalSharesForDate("2026-09-30"), 183_058_121);
  assert.equal(getTotalSharesForDate("2026-10-01"), 183_058_121);
  assert.equal(getTotalSharesForDate("2025-09-30"), 204_462_162);
  assert.equal(getTotalSharesForDate(null), 183_058_121);
  assert.equal(getTotalSharesForDate("invalid"), 183_058_121);
});

test("treasury shares exclude cancelled shares while program execution remains intact", () => {
  const historicalBuybacks = buybacks.filter((row) => row.Datum <= "2026-09-25");
  const programBought = historicalBuybacks.filter((row) => row.Datum >= "2026-05-18" && row.Antal_aktier > 0)
    .reduce((sum, row) => sum + row.Antal_aktier, 0);
  const treasury = calculateTreasuryShares({ buybackData: historicalBuybacks });

  assert.equal(programBought, 16_615_584);
  assert.equal(treasury, 447_092);
});

test("uses Evolution's reported treasury-share snapshot as the current holding", () => {
  const latestBuybackDate = buybacks.at(-1).Datum;
  const snapshot = treasuryShareSnapshots.at(-1);

  assert.deepEqual(snapshot, { date: "2026-10-02", shares: 17_157_092 });
  assert.equal(latestBuybackDate, snapshot.date);
  assert.equal(calculateTreasuryShares({ buybackData: buybacks }), snapshot.shares);
});

test("applies only post-snapshot transactions to Evolution's reported holding", () => {
  const afterSnapshot = [
    ...buybacks,
    { Datum: "2026-10-05", Antal_aktier: 100, Transaktionsvärde: 80_000 },
    { Datum: "2026-10-06", Antal_aktier: -50, Transaktionsvärde: 0 },
  ];

  assert.equal(calculateTreasuryShares({ buybackData: afterSnapshot }), 17_157_142);
});

test("capital and transaction disclosures of the same cancellation are counted once", () => {
  const historicalBuybacks = buybacks.filter((row) => row.Datum <= "2026-09-25");
  const duplicate = { Datum: change.date, Antal_aktier: -change.cancelledShares };
  const rows = [...historicalBuybacks, duplicate, { ...duplicate }];
  assert.equal(calculateTreasuryShares({ buybackData: rows }), 447_092);
  assert.equal(getShareCancellations(rows).filter((row) => row.date === change.date).length, 1);
  assert.equal(calculateCancelledShares(rows), calculateCancelledShares(buybacks));
});

test("treasury calculation rejects invalid input and never produces negative holdings", () => {
  assert.equal(calculateTreasuryShares({ buybackData: null }), 0);
  assert.equal(calculateTreasuryShares({ buybackData: buybacks, programStartDate: "invalid" }), 0);
  assert.equal(calculateTreasuryShares({ buybackData: [
    { Datum: "2027-01-02", Antal_aktier: 100, Transaktionsvärde: 1_000 },
    { Datum: "2027-01-03", Antal_aktier: -200 },
  ], programStartDate: "2027-01-01" }), 0);
});
