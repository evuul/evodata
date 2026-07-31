// Verifies the public Founder offering used across marketing and account surfaces.

import assert from "node:assert/strict";
import test from "node:test";
import { FOUNDER_BENEFITS, FOUNDER_PROGRAM } from "./founderProgram.js";

test("keeps the Founder program limited to 30 places", () => {
  assert.equal(FOUNDER_PROGRAM.maximumFounders, 30);
  assert.equal(FOUNDER_PROGRAM.minimumDonationSek, 500);
  assert.equal(FOUNDER_PROGRAM.cumulativeDonations, true);
});

test("publishes complete bilingual Founder benefits", () => {
  assert.deepEqual(
    FOUNDER_BENEFITS.map((benefit) => benefit.id),
    ["extended-history", "csv-export", "recognition"]
  );

  for (const benefit of FOUNDER_BENEFITS) {
    assert.ok(benefit.title.sv);
    assert.ok(benefit.title.en);
    assert.ok(benefit.description.sv);
    assert.ok(benefit.description.en);
  }
});
