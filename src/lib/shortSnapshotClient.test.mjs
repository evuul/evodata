import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchLatestShortPercent,
  fetchShortHistory,
  normalizeShortHistoryItems,
  normalizeShortSnapshotResponse,
} from "./shortSnapshotClient.js";

test("normalizeShortSnapshotResponse accepts numeric strings", () => {
  assert.deepEqual(normalizeShortSnapshotResponse({
    totalPercent: "5.5",
    observedDate: "2026-06-10",
  }), {
    totalPercent: 5.5,
    observedDate: "2026-06-10",
  });
});

test("normalizeShortSnapshotResponse returns null when totalPercent is invalid", () => {
  assert.equal(normalizeShortSnapshotResponse({ totalPercent: null }), null);
  assert.equal(normalizeShortSnapshotResponse({ totalPercent: "n/a" }), null);
});

test("normalizeShortHistoryItems coerces and sorts history rows", () => {
  assert.deepEqual(
    normalizeShortHistoryItems([
      { date: "2026-06-10", percent: "5.5" },
      { date: "2026-06-09", percent: 5.52 },
      { date: "2026-06-08", percent: "n/a" },
    ]),
    [
      { date: "2026-06-09", percent: 5.52 },
      { date: "2026-06-10", percent: 5.5 },
    ]
  );
});

test("fetchShortHistory normalizes API history payload", async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return {
        updatedAt: "2026-06-10T09:30:00.000Z",
        items: [{ date: "2026-06-10", percent: "5.5" }],
      };
    },
  });

  assert.deepEqual(await fetchShortHistory({ fetchImpl }), {
    ok: true,
    payload: {
      updatedAt: "2026-06-10T09:30:00.000Z",
      items: [{ date: "2026-06-10", percent: "5.5" }],
    },
    items: [{ date: "2026-06-10", percent: 5.5 }],
    updatedAt: "2026-06-10T09:30:00.000Z",
  });
});

test("fetchLatestShortPercent prefers live snapshot over history", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      async json() {
        return { totalPercent: "5.5", observedDate: "2026-06-10" };
      },
    };
  };

  assert.deepEqual(await fetchLatestShortPercent({ fetchImpl }), {
    percent: 5.5,
    observedDate: "2026-06-10",
    source: "snapshot",
  });
  assert.equal(calls.length, 1);
});

test("fetchLatestShortPercent falls back to latest history row", async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    async json() {
      if (String(url).startsWith("/api/short?")) {
        return { totalPercent: null };
      }
      return {
        items: [
          { date: "2026-06-09", percent: "5.52" },
          { date: "2026-06-10", percent: "5.5" },
        ],
      };
    },
  });

  assert.deepEqual(await fetchLatestShortPercent({ fetchImpl }), {
    percent: 5.5,
    observedDate: "2026-06-10",
    source: "history",
  });
});
