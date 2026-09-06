// Defines shared Hourly quality rules, fixed-universe validation, and Stockholm calendar windows.

import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { finiteNumberOrNull, isPlayerSampleFresh } from "./livePlayerSnapshot.js";

export const HOURLY_BASELINE_DAYS = 56;
export const HOURLY_BASELINE_SOURCE = "fixed-lobby-hourly-v2";
export const HOURLY_SLOT_MS = 10 * 60 * 1000;
export const HOURLY_MIN_SLOTS = 2;
export const HOURLY_MIN_SPAN_MS = 20 * 60 * 1000;
export const HOURLY_MIN_DAYS = 7;
export const HOURLY_MIN_RECENT_DAYS = 3;
export const HOURLY_RECENT_DAYS = 7;
export const HOURLY_MAX_LIVE_AGE_MS = 20 * 60 * 1000;
export const HOURLY_MAX_SOURCE_SKEW_MS = HOURLY_SLOT_MS;
export const HOURLY_MAX_BASELINE_AGE_MS = 48 * 60 * 60 * 1000;

const calendar = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", hourCycle: "h23",
});

export function stockholmParts(timestamp = Date.now()) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid Hourly timestamp");
  const parts = Object.fromEntries(calendar.formatToParts(date).map(({ type, value }) => [type, value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: parts.hour };
}

export function shiftHourlyDay(day, days) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function hourlyWindow(now = Date.now()) {
  const endDay = stockholmParts(now).day;
  return {
    startDay: shiftHourlyDay(endDay, -HOURLY_BASELINE_DAYS),
    endDay,
    recentStartDay: shiftHourlyDay(endDay, -HOURLY_RECENT_DAYS),
  };
}

export function cohortSignature(cohort = HOURLY_LOBBY_COHORT) {
  if (!cohort?.id || !Array.isArray(cohort.gameIds) || !cohort.gameIds.length
      || cohort.gameIds.some((id) => typeof id !== "string" || !id)
      || new Set(cohort.gameIds).size !== cohort.gameIds.length) {
    throw new TypeError("Invalid Hourly cohort");
  }
  return `${cohort.id}:${[...cohort.gameIds].sort().join("|")}`;
}

export function validHourlyPlayers(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = finiteNumberOrNull(value);
  return number != null && number >= 0 && number <= 5_000_000 && Number.isInteger(number)
    ? number : null;
}

export function summarizeHourlyCohort(items, {
  now = Date.now(), cohort = HOURLY_LOBBY_COHORT, maxAgeMs = HOURLY_MAX_LIVE_AGE_MS,
} = {}) {
  const expected = new Set(cohort.gameIds);
  const byId = new Map();
  const duplicates = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    if (!expected.has(item?.id)) continue;
    if (byId.has(item.id)) duplicates.add(item.id);
    byId.set(item.id, item);
  }
  let total = 0;
  const timestamps = [];
  const missingGameIds = [];
  for (const id of cohort.gameIds) {
    const item = byId.get(id);
    const value = validHourlyPlayers(item?.players);
    if (duplicates.has(id) || value == null || item?.stale || item?.stuck
        || !isPlayerSampleFresh(item?.fetchedAt, { now, maxAgeMs })) {
      missingGameIds.push(id);
      continue;
    }
    total += value;
    timestamps.push(Date.parse(item.fetchedAt));
  }
  const oldestTs = timestamps.length ? Math.min(...timestamps) : null;
  const newestTs = timestamps.length ? Math.max(...timestamps) : null;
  const synchronized = oldestTs != null && newestTs - oldestTs <= HOURLY_MAX_SOURCE_SKEW_MS;
  const complete = !missingGameIds.length && synchronized;
  return {
    complete, total: complete ? total : null, missingGameIds,
    healthyGames: timestamps.length, expectedGames: cohort.gameIds.length,
    measuredAt: oldestTs == null ? null : new Date(oldestTs).toISOString(),
    reason: missingGameIds.length ? "incomplete-live" : synchronized ? null : "unsynchronized-live",
    oldestTs, newestTs,
  };
}

export function buildHourlyObservation(items, { now = Date.now(), cohort = HOURLY_LOBBY_COHORT } = {}) {
  // Collection is stricter than presentation: never carry a previous slot forward.
  const lobby = summarizeHourlyCohort(items, { now, cohort, maxAgeMs: HOURLY_SLOT_MS });
  if (!lobby.complete) return null;
  return {
    ts: lobby.oldestTs,
    newestTs: lobby.newestTs,
    value: lobby.total,
    signature: cohortSignature(cohort),
  };
}
