'use client';

// Shares the lightweight materialized monthly lobby request across dashboard views.

import { createClientJsonResource } from "./clientJsonResource.js";

const monthlyLobbyResource = createClientJsonResource({
  url: "/api/casinoscores/lobby/monthly",
  cacheMs: 5 * 60 * 1000,
  timeoutMs: 5_000,
  retries: 1,
});

export function fetchMonthlyLobbyActivity({ force = false } = {}) {
  return force ? monthlyLobbyResource.refresh() : monthlyLobbyResource.load();
}
