// Central client resources for live player snapshots and lobby statistics.

import { createClientJsonResource } from "./clientJsonResource.js";

const latestPlayersResource = createClientJsonResource({
  url: "/api/casinoscores/players/latest",
  cacheMs: 30 * 1000,
  timeoutMs: 8_000,
  retries: 1,
});

const allPlayersResource = createClientJsonResource({
  url: "/api/casinoscores/players/all",
  cacheMs: 30 * 1000,
  timeoutMs: 10_000,
  retries: 1,
});

const lobbyStatsResources = new Map();

export function buildLobbyStatsUrl({ includeHourly = false } = {}) {
  return includeHourly
    ? "/api/casinoscores/lobby/stats?includeHourly=1"
    : "/api/casinoscores/lobby/stats";
}

function getLobbyStatsResource({ includeHourly = false } = {}) {
  const key = includeHourly ? "hourly" : "public";
  if (!lobbyStatsResources.has(key)) {
    lobbyStatsResources.set(key, createClientJsonResource({
      url: buildLobbyStatsUrl({ includeHourly }),
      cacheMs: 60 * 1000,
      timeoutMs: 8_000,
      retries: 1,
    }));
  }
  return lobbyStatsResources.get(key);
}

const loadResource = (resource, force) => (force ? resource.refresh() : resource.load());

export function fetchLatestPlayersShared({ force = false } = {}) {
  return loadResource(latestPlayersResource, force);
}

export function fetchAllPlayersShared({ force = false } = {}) {
  return loadResource(allPlayersResource, force);
}

export function fetchLobbyStatsShared({ includeHourly = false, force = false } = {}) {
  return loadResource(getLobbyStatsResource({ includeHourly }), force);
}
