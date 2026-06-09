import test from "node:test";
import assert from "node:assert/strict";

import { upsertShortHistoryEntry } from "./shortHistoryStore.js";

test("upsertShortHistoryEntry replaces the existing day and keeps order", () => {
  const history = [
    { date: "2026-06-03", percent: 5.24 },
    { date: "2026-06-04", percent: 5.34 },
    { date: "2026-06-05", percent: 5.41 },
  ];

  const result = upsertShortHistoryEntry(history, { date: "2026-06-05", percent: 5.48 });

  assert.equal(result.changed, true);
  assert.deepEqual(result.items, [
    { date: "2026-06-03", percent: 5.24 },
    { date: "2026-06-04", percent: 5.34 },
    { date: "2026-06-05", percent: 5.48 },
  ]);
});

test("upsertShortHistoryEntry appends a new day", () => {
  const history = [{ date: "2026-06-04", percent: 5.34 }];

  const result = upsertShortHistoryEntry(history, { date: "2026-06-05", percent: 5.41 });

  assert.equal(result.changed, true);
  assert.deepEqual(result.items, [
    { date: "2026-06-04", percent: 5.34 },
    { date: "2026-06-05", percent: 5.41 },
  ]);
});
