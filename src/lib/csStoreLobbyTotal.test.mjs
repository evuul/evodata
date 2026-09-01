// Verifies that lobby totals retain the metadata required for safe comparisons.

import assert from "node:assert/strict";
import test from "node:test";

import {
  getLatestLobbyTotalSample,
  getLobbyTotalSeries,
  saveLobbyTotalSample,
} from "./csStore.js";

test("lobby total samples round-trip their game-universe metadata", async () => {
  const timestamp = new Date().toISOString();
  const universeKey = "2:0123456789abcdef";

  await saveLobbyTotalSample(timestamp, 12_345, {
    universeKey,
    includedGames: 2,
  });

  const rows = await getLobbyTotalSeries(1);
  const saved = rows.find((row) => row.ts === Date.parse(timestamp));

  assert.deepEqual(saved, {
    ts: Date.parse(timestamp),
    value: 12_345,
    universeKey,
    includedGames: 2,
  });
  assert.deepEqual(await getLatestLobbyTotalSample(), saved);
});
