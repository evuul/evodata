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

const lobbyStatsResource = createClientJsonResource({
  url: "/api/casinoscores/lobby/stats",
  cacheMs: 60 * 1000,
  timeoutMs: 8_000,
  retries: 1,
});

export function buildLobbyStatsUrl() {
  return "/api/casinoscores/lobby/stats";
}

const loadResource = (resource, force) => (force ? resource.refresh() : resource.load());

export function fetchLatestPlayersShared({ force = false } = {}) {
  return loadResource(latestPlayersResource, force);
}

export function fetchAllPlayersShared({ force = false } = {}) {
  return loadResource(allPlayersResource, force);
}

export function fetchLobbyStatsShared({ force = false } = {}) {
  return loadResource(lobbyStatsResource, force);
}
