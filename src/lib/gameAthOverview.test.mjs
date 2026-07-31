// Verifies that persisted game records cannot be lowered by stale overview data.

import assert from "node:assert/strict";
import test from "node:test";

import { mergeGameAthIntoOverview } from "./gameAthOverview.js";

const snapshot = {
  source: "daily-history",
  games: {
    "ice-fishing": { value: 42_967, at: "2026-07-31T16:22:00.000Z" },
  },
};

test("raises a stale overview ATH from the persisted game snapshot", () => {
  const payload = {
    slugDetails: [{
      slug: "ice-fishing",
      latest: { value: 35_000, at: "2026-07-31T17:00:00.000Z" },
      ath: { value: 37_000, at: "2026-07-20T12:00:00.000Z" },
    }],
  };

  const merged = mergeGameAthIntoOverview(payload, snapshot);
  assert.deepEqual(merged.slugDetails[0].ath, {
    value: 42_967,
    at: "2026-07-31T16:22:00.000Z",
  });
  assert.equal(merged.slugDetails[0].latest.value, 35_000);
});

test("never lowers a higher overview ATH", () => {
  const payload = {
    slugDetails: [{ slug: "ice-fishing", ath: { value: 45_000, at: null } }],
  };
  assert.equal(mergeGameAthIntoOverview(payload, snapshot), payload);
});

test("adds persisted games missing from a stale overview", () => {
  const merged = mergeGameAthIntoOverview({ slugDetails: [] }, snapshot);
  assert.deepEqual(merged.slugDetails, [{
    slug: "ice-fishing",
    latest: null,
    ath: { value: 42_967, at: "2026-07-31T16:22:00.000Z" },
  }]);
});
