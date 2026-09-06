#!/usr/bin/env node
// Reviews local hourly history using the same fixed games and quality rules as the application.

import { spawnSync } from "node:child_process";
import { HOURLY_LOBBY_COHORT } from "../src/config/hourlyLobbyCohort.js";
import { buildHourlyHistoryArchive, hourlyArchiveObservations } from "../src/lib/hourlyLobbyHistoryArchive.js";
import { buildHourlyBaseline } from "../src/lib/hourlyLobbyAggregation.js";

const container = process.env.LOCAL_REDIS_CONTAINER || "evodata-redis";
const redisDb = process.env.LOCAL_REDIS_DB || "0";

function readGameSeries(id) {
  const result = spawnSync("docker", ["exec", "-i", container, "redis-cli", "-n", redisDb,
    "--raw", "LRANGE", `cs:${id}:samples`, "0", "4999"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Could not read local Redis history");
  return result.stdout.split("\n").filter(Boolean).flatMap((raw) => {
    try { return [JSON.parse(raw)]; } catch { return []; }
  });
}

try {
  const series = Object.fromEntries(HOURLY_LOBBY_COHORT.gameIds.map((id) => [id, readGameSeries(id)]));
  const archive = buildHourlyHistoryArchive(series);
  const baseline = buildHourlyBaseline(hourlyArchiveObservations(archive));
  console.log(`Historical reference: ${baseline.cohort.gameIds.length} fixed games, ${baseline.readyHours}/24 hours.`);
  console.log(`Reviewed ${archive.coverage.rawSamples} game readings; ${archive.coverage.matchedObservations} complete matches.`);
  console.table(baseline.hourlyByHour.map(({ hour, baselineAvg, distinctDays, lastDay }) => ({
    hour, average: baselineAvg == null ? null : Math.round(baselineAvg), days: distinctDays, lastDay,
  })));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
