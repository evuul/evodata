#!/usr/bin/env node
// Reviews an exported history and optionally initializes only the new Hourly archive and cache.

import fs from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildHourlyHistoryArchive, hourlyArchiveObservations } from "../src/lib/hourlyLobbyHistoryArchive.js";
import { buildHourlyBaseline } from "../src/lib/hourlyLobbyAggregation.js";
import { loadHourlyLobbyBaseline } from "../src/lib/hourlyLobbyBaseline.js";
import { setStoredHourlyArchive } from "../src/lib/hourlyLobbyStore.js";

const { values } = parseArgs({ options: {
  input: { type: "string" }, output: { type: "string" }, now: { type: "string" }, write: { type: "boolean", default: false },
} });
if (!values.input) throw new Error("Provide --input with a local series export");
if (values.write && values.now) throw new Error("--now is only available for offline review");
const now = values.now ? Date.parse(values.now) : Date.now();
if (!Number.isFinite(now)) throw new Error("Invalid --now timestamp");
const data = JSON.parse(await fs.readFile(values.input, "utf8"));
if (!data.series || typeof data.series !== "object" || Array.isArray(data.series)) throw new Error("Missing game series export");
const archive = buildHourlyHistoryArchive(data.series, { now });
let baseline = { ...buildHourlyBaseline(hourlyArchiveObservations(archive), { now }), history: archive.coverage };
if (values.output) await fs.writeFile(values.output, JSON.stringify(baseline, null, 2) + "\n");
if (values.write) {
  if (!process.env.LOCAL_REDIS_URL && !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
    throw new Error("Configure a Redis destination before writing");
  }
  await setStoredHourlyArchive(archive);
  baseline = await loadHourlyLobbyBaseline({ now, force: true });
}
console.log(JSON.stringify({
  written: values.write, cohort: baseline.cohort.id, games: baseline.cohort.gameIds.length,
  history: baseline.history, retainedSlots: baseline.samples, readyHours: baseline.readyHours,
  hours: baseline.hourlyByHour.map(({ hour, baselineAvg, distinctDays, recentDistinctDays, firstDay, lastDay, status }) =>
    ({ hour, baselineAvg, distinctDays, recentDistinctDays, firstDay, lastDay, status })),
}, null, 2));
// The optional local Redis adapter holds a connection after all awaited writes finish.
process.exit(0);
