// Reconciles the regular lobby's fresh sources and averages equally spaced complete observations.

import { GAMES } from "../config/games.js";
import { isPlayerSampleFresh, finiteNumberOrNull } from "./livePlayerSnapshot.js";
import { getUnibetPilotGameId } from "./unibetPilotFallback.js";

export const REGULAR_LOBBY_DAILY_METHOD = "regular-lobby-max-fresh-v2";
export const REGULAR_LOBBY_SLOT_MS = 10 * 60 * 1000;
const MAX_AGE_MS = 20 * 60 * 1000;
const MIN_SLOTS_PER_HOUR = 2;
const calendar = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", hourCycle: "h23",
});

function calendarParts(ts) {
  const parts = Object.fromEntries(calendar.formatToParts(new Date(ts)).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function previousRegularLobbyDay(now = Date.now()) {
  const date = new Date(`${calendarParts(now).date}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// New games enter daily totals from their first full tracking day.
export function regularLobbyCatalogForDate(date, catalog = GAMES) {
  return catalog.filter(game => !game.dailyTrackingFrom || game.dailyTrackingFrom <= date);
}

function playersOrNull(value) {
  const players = finiteNumberOrNull(value);
  return Number.isInteger(players) && players >= 0 && players <= 5_000_000 ? players : null;
}

function uniqueById(items) {
  const result = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.id) continue;
    result.set(item.id, result.has(item.id) ? null : item);
  }
  return result;
}

function hasCompleteUnibetLists(sample) {
  const urls = Array.isArray(sample?.sourceUrls) ? sample.sourceUrls.map(url => String(url).toLowerCase()) : [];
  return ["gameshows", "roulette", "baccarat"].every(category =>
    urls.some(url => url.includes(`livecasino${category}lobby`))
  );
}

export function selectRegularLobbyReadings(primaryItems, sample, { now = Date.now(), catalog = GAMES } = {}) {
  const primary = uniqueById(primaryItems);
  const pilot = uniqueById(sample?.status === "ok" ? sample.games : []);
  return catalog.flatMap(game => {
    const nativeId = game.unibetId ?? getUnibetPilotGameId(game.id);
    const native = pilot.get(nativeId);
    const unavailableNative = game.source === "unibet" && sample?.status === "ok"
      && hasCompleteUnibetLists(sample) && !pilot.has(nativeId)
      ? { players: 0, fetchedAt: sample.collectedAt, source: "unibet" }
      : null;
    const candidates = [
      { ...primary.get(game.id), source: "primary" },
      { ...native, fetchedAt: native?.fetchedAt ?? sample?.collectedAt, source: native?.source ?? "unibet" },
      { ...unavailableNative },
    ].filter(item => playersOrNull(item.players) != null && !item.stale && !item.stuck
      && ["primary", "unibet"].includes(item.source)
      && isPlayerSampleFresh(item.fetchedAt, { now, maxAgeMs: MAX_AGE_MS }));
    candidates.sort((a, b) => b.players - a.players || Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt));
    const best = candidates[0];
    return best ? [{ id: game.id, players: Number(best.players), fetchedAt: best.fetchedAt, source: best.source }] : [];
  });
}

function expectedDaySlots(date) {
  const noon = Date.parse(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(noon)
      || new Date(noon).toISOString().slice(0, 10) !== date) throw new TypeError("Invalid lobby date");
  const slots = [];
  for (let ts = noon - 36 * 3600000; ts < noon + 36 * 3600000; ts += REGULAR_LOBBY_SLOT_MS) {
    const parts = calendarParts(ts);
    if (parts.date === date) slots.push({ ts, hour: parts.hour });
  }
  return slots;
}

// Older series mix recovery writes with primary readings. Remove known recovery timestamps first.
function primaryHistory(seriesByGame, samples, catalog) {
  const recoveryTimes = new Map();
  for (const sample of samples) {
    const ts = Date.parse(sample?.collectedAt);
    for (const id of sample?.seriesSavedGameIds ?? []) {
      const times = recoveryTimes.get(id) ?? new Set();
      times.add(ts);
      recoveryTimes.set(id, times);
    }
  }
  return new Map(catalog.map(game => {
    const points = (seriesByGame?.get?.(game.id) ?? []).filter(p => Number.isFinite(p?.ts)
      && playersOrNull(p.value) != null && !recoveryTimes.get(game.id)?.has(p.ts)
      && !p.stale && !p.stuck).sort((a, b) => a.ts - b.ts);
    const unique = new Map();
    for (const point of points) {
      const previous = unique.get(point.ts);
      unique.set(point.ts, previous && previous.value !== point.value ? { ...point, stuck: true } : previous ?? point);
    }
    const readings = [...unique.values()];
    for (let start = 0; start < readings.length;) {
      let end = start + 1;
      while (end < readings.length && readings[end].value === readings[start].value) end++;
      if (end - start >= 4 && readings[end - 1].ts - readings[start].ts >= 30 * 60000) {
        for (let i = start; i < end; i++) readings[i] = { ...readings[i], stuck: true };
      }
      start = end;
    }
    return [game.id, readings];
  }));
}

// Recorded readings retain provenance; only verified native Unibet rows can fill omissions.
function reconcileRecordedReadings(sample, catalog, now) {
  const recorded = selectRegularLobbyReadings(
    sample.regularLobbyReadings.filter(p => p.source === "primary"), {
      status: "ok", collectedAt: sample.collectedAt,
      games: sample.regularLobbyReadings.filter(p => p.source === "unibet")
        .map(p => ({ ...p, id: getUnibetPilotGameId(p.id) })),
    }, { now, catalog }
  );
  const present = new Set(recorded.map(reading => reading.id));
  const nativeSample = {
    ...sample,
    games: (sample.games ?? []).filter(game => game.provider === "Evolution"
      && /@evolution$/i.test(game.href ?? "")),
  };
  const missingCatalog = catalog.filter(game => !present.has(game.id));
  return [...recorded, ...selectRegularLobbyReadings([], nativeSample, { now, catalog: missingCatalog })];
}

export function buildRegularLobbyDaily(samples, seriesByGame, date, { catalog = GAMES, now = Date.now() } = {}) {
  const expected = expectedDaySlots(date);
  if (calendarParts(now).date <= date) throw new Error("Only completed lobby days can be averaged");
  catalog = regularLobbyCatalogForDate(date, catalog);
  const gameIds = catalog.map(g => g.id).sort();
  if (!gameIds.length || new Set(gameIds).size !== gameIds.length) throw new Error("Invalid regular lobby catalog");
  const allSamples = (Array.isArray(samples) ? samples : []).filter(s => s?.status === "ok" && Number.isFinite(Date.parse(s.collectedAt)));
  const history = primaryHistory(seriesByGame, allSamples, catalog);
  const slots = new Map();
  for (const sample of allSamples) {
    const ts = Date.parse(sample.collectedAt);
    if (calendarParts(ts).date !== date) continue;
    const primary = catalog.flatMap(game => {
      const p = history.get(game.id).findLast(point => point.ts <= ts);
      return p ? [{ id: game.id, players: p.value, fetchedAt: new Date(p.ts).toISOString(), stuck: p.stuck }] : [];
    });
    const readings = Array.isArray(sample.regularLobbyReadings)
      ? reconcileRecordedReadings(sample, catalog, ts)
      : selectRegularLobbyReadings(primary, sample, { now: ts, catalog });
    if (readings.length !== catalog.length) continue;
    const slot = Math.floor(ts / REGULAR_LOBBY_SLOT_MS) * REGULAR_LOBBY_SLOT_MS;
    // A retry replaces its slot, without adding weight or picking an intraday peak.
    if (!slots.has(slot) || slots.get(slot).ts < ts) slots.set(slot, { ts, readings });
  }
  const expectedByHour = new Map();
  const actualByHour = new Map();
  for (const slot of expected) expectedByHour.set(slot.hour, (expectedByHour.get(slot.hour) ?? 0) + 1);
  for (const slot of slots.keys()) {
    const { hour } = calendarParts(slot);
    actualByHour.set(hour, (actualByHour.get(hour) ?? 0) + 1);
  }
  const missingHours = [...expectedByHour]
    .filter(([hour]) => (actualByHour.get(hour) ?? 0) < MIN_SLOTS_PER_HOUR)
    .map(([hour]) => hour);
  const complete = slots.size >= Math.ceil(expected.length * 0.9) && !missingHours.length;
  const coverage = { slots: slots.size, expectedSlots: expected.length, missingHours };
  if (!complete) return {
    date, complete: false, method: REGULAR_LOBBY_DAILY_METHOD, computedAt: new Date(now).toISOString(),
    coverage, gameIds, reason: "insufficient-daily-coverage",
  };
  const totals = Object.fromEntries(gameIds.map(id => [id, 0]));
  const sourceCounts = { primary: 0, unibet: 0 };
  for (const { readings } of slots.values()) for (const reading of readings) {
    totals[reading.id] += reading.players;
    sourceCounts[reading.source]++;
  }
  const averages = Object.fromEntries(gameIds.map(id => [id, Math.round(totals[id] / slots.size * 100) / 100]));
  return {
    date, complete: true, method: REGULAR_LOBBY_DAILY_METHOD, gameIds, coverage, sourceCounts, averages,
    avgPlayers: Math.round(Object.values(averages).reduce((sum, avg) => sum + avg, 0) * 100) / 100,
    computedAt: new Date(now).toISOString(),
  };
}
