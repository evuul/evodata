#!/usr/bin/env node
// Backfills verified hourly game readings from retained Unibet samples and rebuilds the shared baseline.

import fs from "node:fs/promises";
import { parseArgs } from "node:util";
import { GAMES } from "../src/config/games.js";
import { buildExpandingHourlyBaseline } from "../src/lib/hourlyLobbyExpansion.js";
import { kvRestRequest } from "../src/lib/kvClient.js";
import { loadHourlyLobbyBaseline } from "../src/lib/hourlyLobbyBaseline.js";
import { getStoredHourlyBaseline } from "../src/lib/hourlyLobbyStore.js";
import { saveHourlyGameObservations, selectHourlyUnibetCandidates } from "../src/lib/hourlyLobbyGameStore.js";
import { UNIBET_PILOT_HISTORY_KEY, UNIBET_PILOT_HISTORY_LIMIT } from "../src/lib/unibetPilotStore.js";

const { values } = parseArgs({ options: {
  write: { type: "boolean", default: false },
  output: { type: "string" },
} });
const parse = (value) => typeof value === "string" ? JSON.parse(value) : value;
const samples = [];
for (let start = 0; start < UNIBET_PILOT_HISTORY_LIMIT; start += 288) {
  const response = await kvRestRequest(
    `/lrange/${encodeURIComponent(UNIBET_PILOT_HISTORY_KEY)}/${start}/${start + 287}`,
    {},
    { serviceName: "Hourly Unibet backfill" }
  );
  const rows = Array.isArray(response?.result) ? response.result.map(parse) : [];
  samples.push(...rows.filter((sample) => sample?.status === "ok"));
  if (rows.length < 288) break;
}
if (!samples.length) throw new Error("No retained Unibet samples were found");
const unibetItems = samples.flatMap((sample) => selectHourlyUnibetCandidates(sample));
const nativeIds = new Set(unibetItems.map((item) => item.id));
const primaryOnlyGames = GAMES.filter((game) => !nativeIds.has(game.id));
const primaryOnlyIds = new Set(primaryOnlyGames.map((game) => game.id));
const primaryItems = samples.flatMap((sample) => (sample.regularLobbyReadings ?? [])
  .filter((item) => primaryOnlyIds.has(item.id) && item.source === "primary")
  .map((item) => ({ ...item, qualityVerified: true })));
const newestAt = Math.max(
  ...unibetItems.map((item) => Date.parse(item.fetchedAt)),
  ...primaryItems.map((item) => Date.parse(item.fetchedAt))
);
const report = {
  samples: samples.length,
  readings: unibetItems.length + primaryItems.length,
  games: GAMES.map((game) => ({
    id: game.id,
    unibetReadings: unibetItems.filter((item) => item.id === game.id).length,
    primaryReadings: primaryItems.filter((item) => item.id === game.id).length,
  })),
};
const previous = await getStoredHourlyBaseline();
const preview = buildExpandingHourlyBaseline({
  observations: [],
  gameObservations: [
    ...unibetItems.map((item) => ({
      id: item.id,
      ts: Date.parse(item.fetchedAt),
      value: item.players,
      source: "unibet",
    })),
    ...primaryItems.map((item) => ({
      id: item.id,
      ts: Date.parse(item.fetchedAt),
      value: item.players,
      source: "primary",
      qualityVerified: true,
    })),
  ],
  previous,
  now: newestAt,
});
report.preview = {
  games: preview.cohort.gameIds,
  readyHours: preview.readyHours,
  recentHours: preview.recentHours,
  waitingGames: preview.expansion.waitingGames,
};
if (values.write) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN || process.env.LOCAL_REDIS_URL) {
    throw new Error("Configure production KV REST and omit LOCAL_REDIS_URL");
  }
  if (!values.output) throw new Error("Provide --output so the previous baseline can be backed up");
  await fs.writeFile(values.output, JSON.stringify({ baseline: previous, report }, null, 2) + "\n", { mode: 0o600 });
  report.persistence = {
    unibet: await saveHourlyGameObservations(unibetItems, {
      source: "unibet",
      now: newestAt,
      maxAgeMs: 90 * 24 * 60 * 60 * 1000,
      allowMultipleSlots: true,
      restoreInvalid: true,
    }),
    primary: await saveHourlyGameObservations(primaryItems, {
      source: "primary",
      now: newestAt,
      maxAgeMs: 90 * 24 * 60 * 60 * 1000,
      allowMultipleSlots: true,
      restoreInvalid: true,
    }),
  };
  const baseline = await loadHourlyLobbyBaseline({ now: newestAt, force: true });
  report.baseline = {
    computedAt: baseline.computedAt,
    games: baseline.cohort.gameIds,
    readyHours: baseline.readyHours,
    recentHours: baseline.recentHours,
    waitingGames: baseline.expansion.waitingGames,
  };
}
console.log(JSON.stringify({ written: values.write, ...report }, null, 2));
