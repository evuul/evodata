'use client';

// Fetches the account-scoped hourly lobby comparison without sharing user caches.

import { fetchAuthJson } from "./clientApi.js";

export const HOURLY_LOBBY_URL = "/api/casinoscores/lobby/hourly";

export function fetchHourlyLobbyBaseline(token, { signal } = {}) {
  return fetchAuthJson(token, HOURLY_LOBBY_URL, {
    cache: "no-store",
    signal,
  });
}
