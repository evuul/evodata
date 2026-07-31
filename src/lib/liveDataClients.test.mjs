// Verifies stable URLs for the shared lobby, player and top-win client resources.

import assert from "node:assert/strict";
import test from "node:test";

import { buildLobbyStatsUrl } from "./casinoScoresClient.js";
import { buildOverviewUrl, normalizeOverviewDays } from "./csOverviewClient.js";
import { buildLiveTop3Url } from "./liveTop3Client.js";

test("normalizes lobby overview ranges to the API contract", () => {
  assert.equal(normalizeOverviewDays("200.9"), 200);
  assert.equal(normalizeOverviewDays(1), 7);
  assert.equal(normalizeOverviewDays(999), 730);
  assert.equal(buildOverviewUrl(200), "/api/casinoscores/lobby/overview?days=200");
  assert.equal(
    buildOverviewUrl(365, { extendedAccess: true }),
    "/api/casinoscores/lobby/overview?days=365&access=extended"
  );
  assert.equal(
    buildOverviewUrl(730, { extendedAccess: true }),
    "/api/casinoscores/lobby/overview?days=730&access=extended"
  );
});

test("separates public and hourly lobby stats resources", () => {
  assert.equal(buildLobbyStatsUrl(), "/api/casinoscores/lobby/stats");
  assert.equal(
    buildLobbyStatsUrl({ includeHourly: true }),
    "/api/casinoscores/lobby/stats?includeHourly=1"
  );
});

test("builds one normalized top-win URL for all dashboard consumers", () => {
  const url = buildLiveTop3Url({ historyDays: 30, historyPerDay: 3 });
  assert.match(url, /historyDays=30/);
  assert.match(url, /historyPerDay=3/);
  assert.doesNotMatch(url, /historyDays=7/);
});
