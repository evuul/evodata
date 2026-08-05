// Verifies the public Premium offer shown on access and information surfaces.

import assert from "node:assert/strict";
import test from "node:test";
import { PREMIUM_BENEFITS, PREMIUM_PROGRAM } from "./premiumProgram.js";

test("keeps one Premium month tied to a 30 SEK voluntary contribution", () => {
  assert.equal(PREMIUM_PROGRAM.monthlyDonationSek, 30);
  assert.equal(PREMIUM_PROGRAM.accessDaysPerMonth, 30);
});

test("publishes complete bilingual Premium benefits", () => {
  assert.deepEqual(
    PREMIUM_BENEFITS.map((benefit) => benefit.id),
    ["extended-lobby", "extended-history", "csv-export"]
  );

  for (const benefit of PREMIUM_BENEFITS) {
    assert.ok(benefit.title.sv);
    assert.ok(benefit.title.en);
    assert.ok(benefit.description.sv);
    assert.ok(benefit.description.en);
  }
});
