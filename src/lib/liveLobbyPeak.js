// Derives a comparable lobby total and a stable signature for its included games.

import { createHash } from "node:crypto";

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeGameId = (value) => String(value || "").trim();

export function buildLobbyUniverseKey(gameIds) {
  const normalizedIds = Array.from(new Set(
    (Array.isArray(gameIds) ? gameIds : []).map(normalizeGameId).filter(Boolean)
  )).sort();
  if (!normalizedIds.length) return null;
  const digest = createHash("sha256").update(normalizedIds.join("\n")).digest("hex").slice(0, 16);
  return `${normalizedIds.length}:${digest}`;
}

export function summarizeObservedLobby(items, { now = null, maxAgeMs = null } = {}) {
  let totalPlayers = 0;
  let newestTimestamp = Number.NEGATIVE_INFINITY;
  let includedGames = 0;
  const includedGameIds = [];
  const referenceTime = Number(now);
  const freshnessLimit = Number(maxAgeMs);
  const enforceFreshness = Number.isFinite(referenceTime) && Number.isFinite(freshnessLimit) && freshnessLimit > 0;

  for (const item of Array.isArray(items) ? items : []) {
    const players = toFiniteNumber(item?.players);
    const timestamp = Date.parse(String(item?.fetchedAt || ""));
    const gameId = normalizeGameId(item?.id);
    const tooOld = enforceFreshness && referenceTime - timestamp > freshnessLimit;
    if (
      item?.stuck ||
      item?.stale ||
      players == null ||
      players < 0 ||
      !Number.isFinite(timestamp) ||
      tooOld ||
      !gameId
    ) continue;

    totalPlayers += players;
    newestTimestamp = Math.max(newestTimestamp, timestamp);
    includedGames += 1;
    includedGameIds.push(gameId);
  }

  return {
    totalPlayers: includedGames > 0 ? Math.round(totalPlayers) : null,
    measuredAt: Number.isFinite(newestTimestamp) ? new Date(newestTimestamp).toISOString() : null,
    includedGames,
    universeKey: buildLobbyUniverseKey(includedGameIds),
  };
}
