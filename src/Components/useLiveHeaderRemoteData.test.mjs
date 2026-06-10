import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuybackFallbackSummary,
  buildBuybackSummary,
} from "./useLiveHeaderRemoteData.js";

test("buildBuybackSummary uses mandate rows and fx rate", () => {
  const summary = buildBuybackSummary(
    {
      updatedAt: "2026-06-10T10:00:00.000Z",
      current: [
        { Datum: "2026-05-17", Antal_aktier: 10, Transaktionsvärde: 100 },
        { Datum: "2026-05-18", Antal_aktier: 20, Transaktionsvärde: 200 },
        { Datum: "2026-05-19", Antal_aktier: "30", Transaktionsvärde: "300" },
      ],
    },
    11
  );

  assert.equal(summary.mandateStart, "2026-05-18");
  assert.equal(summary.mandateEur, 2_000_000_000);
  assert.equal(summary.sharesRepurchased, 50);
  assert.equal(summary.usedSek, 500);
  assert.equal(summary.usedEur, 500 / 11);
  assert.equal(summary.remainingSek, 22_000_000_000 - 500);
  assert.equal(summary.remainingEur, 2_000_000_000 - 500 / 11);
  assert.equal(summary.updatedAt, "2026-06-10T10:00:00.000Z");
  assert.equal(summary.fallback, false);
});

test("buildBuybackFallbackSummary keeps mandate budget when upstream fails", () => {
  const summary = buildBuybackFallbackSummary(11, new Error("upstream down"));

  assert.equal(summary.mandateEur, 2_000_000_000);
  assert.equal(summary.remainingSek, 22_000_000_000);
  assert.equal(summary.remainingEur, 2_000_000_000);
  assert.equal(summary.syncError, "upstream down");
  assert.equal(summary.fallback, true);
});
