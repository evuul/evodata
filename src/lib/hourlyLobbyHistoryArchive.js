// Imports bounded per-game history once and keeps its provenance separate from live collection.

import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { getKv } from "./csStore.js";
import { auditHourlyHistory } from "./hourlyLobbyHistoryAudit.js";
import { cohortSignature, HOURLY_SLOT_MS } from "./hourlyLobbyPolicy.js";
import { getStoredHourlyArchive, setStoredHourlyArchive } from "./hourlyLobbyStore.js";

const ARCHIVE_SOURCE = "fixed-hourly-history-v1";
const MAX_ROWS_PER_GAME = 5000;

export function buildHourlyHistoryArchive(series, { now = Date.now(), cohort = HOURLY_LOBBY_COHORT } = {}) {
  const { observations, ...coverage } = auditHourlyHistory(series, { now, cohort });
  const slots = new Map();
  for (const point of observations) {
    const slot = Math.floor(point.ts / HOURLY_SLOT_MS);
    if (!slots.has(slot) || slots.get(slot).ts < point.ts) slots.set(slot, point);
  }
  return {
    source: ARCHIVE_SOURCE, signature: cohortSignature(cohort),
    importedAt: new Date(now).toISOString(), coverage,
    // Exact-time matches need only one timestamp. Do not repeat the long cohort signature per row.
    points: [...slots.values()].map(({ ts, value }) => [ts, value]),
  };
}

export function hourlyArchiveObservations(archive, cohort = HOURLY_LOBBY_COHORT) {
  if (archive?.source !== ARCHIVE_SOURCE || archive.signature !== cohortSignature(cohort)
      || !Array.isArray(archive.points)) throw new Error("Incompatible Hourly history archive");
  return archive.points.map(([ts, value]) => ({
    ts, newestTs: ts, value, signature: archive.signature, quality: "reconstructed",
  }));
}

export async function readHourlyGameHistory({ cohort = HOURLY_LOBBY_COHORT, getRedis = getKv } = {}) {
  const redis = await getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") throw new Error("Hourly history unavailable");
    return {};
  }
  const series = {};
  for (let offset = 0; offset < cohort.gameIds.length; offset += 6) {
    const ids = cohort.gameIds.slice(offset, offset + 6);
    const pipeline = redis.pipeline();
    ids.forEach((id) => pipeline.lrange(`cs:${id}:samples`, 0, MAX_ROWS_PER_GAME - 1));
    const result = await pipeline.exec();
    if (!Array.isArray(result) || result.length !== ids.length || result.some((rows) => !Array.isArray(rows))) {
      throw new Error("Incomplete Hourly archive read");
    }
    ids.forEach((id, index) => {
      series[id] = result[index].flatMap((row) => {
        try { return [typeof row === "string" ? JSON.parse(row) : row]; } catch { return []; }
      });
    });
  }
  return series;
}

export async function loadHourlyHistoryArchive({
  now = Date.now(), getArchive = getStoredHourlyArchive, readSeries = readHourlyGameHistory,
  saveArchive = setStoredHourlyArchive,
} = {}) {
  const existing = await getArchive();
  if (existing) {
    hourlyArchiveObservations(existing);
    return existing;
  }
  const series = await readSeries();
  const archive = buildHourlyHistoryArchive(series, { now });
  // A newly initialized database may receive old samples later; do not seal an empty import.
  if (!archive.coverage.rawSamples) return archive;
  return saveArchive(archive);
}
