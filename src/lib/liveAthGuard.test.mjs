// Covers the write gate used when live values can raise a stored game ATH.

import assert from "node:assert/strict";
import test from "node:test";

import { selectLiveAthCandidates } from "./liveAthGuard.js";

test("selectLiveAthCandidates keeps only fresh values above the stored ATH", () => {
  const candidates = selectLiveAthCandidates(
    {
      games: {
        "ice-fishing": { value: 42_884, at: "2026-08-02T15:23:00.000Z" },
      },
    },
    [
      { id: "ice-fishing", players: 48_775, fetchedAt: "2026-08-02T15:12:00.000Z", stale: false },
      { id: "crazy-time", players: 11_615, fetchedAt: "2026-08-02T15:12:00.000Z", stale: false },
      { id: "ice-fishing", players: 50_000, fetchedAt: "2026-08-02T15:13:00.000Z", stale: true },
      { id: "big-baller", players: 9_322, stale: false },
    ]
  );

  assert.deepEqual(candidates.map((item) => item.id), ["ice-fishing", "crazy-time"]);
});
