// Verifies lossless daily aggregate snapshot serialization.

import test from "node:test";
import assert from "node:assert/strict";

import {
  deserializeDailyAggregates,
  serializeDailyAggregates,
} from "./dailyAggregatesSnapshot.js";

test("daily aggregate snapshots round-trip maps and numeric fields", () => {
  const source = new Map([
    [
      "game-a",
      new Map([
        [
          "2026-07-29",
          {
            sum: 300,
            count: 3,
            max: 120,
            maxTs: 1_775_000_000_000,
            latestValue: 110,
            latestTs: 1_775_000_100_000,
          },
        ],
      ]),
    ],
  ]);

  const restored = deserializeDailyAggregates(serializeDailyAggregates(source));

  assert.deepEqual(restored.get("game-a").get("2026-07-29"), source.get("game-a").get("2026-07-29"));
});

test("daily aggregate snapshots ignore malformed rows safely", () => {
  const restored = deserializeDailyAggregates({
    "game-a": [null, { date: "2026-07-29", sum: "10", count: "2", max: "invalid" }],
  });

  assert.deepEqual(restored.get("game-a").get("2026-07-29"), {
    sum: 10,
    count: 2,
    max: null,
    maxTs: null,
    latestValue: null,
    latestTs: null,
  });
});
