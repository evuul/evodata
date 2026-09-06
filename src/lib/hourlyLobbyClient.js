'use client';

// Fetches the account-scoped hourly lobby comparison without sharing user caches.

import { fetchAuthJson } from "./clientApi.js";
import { stockholmParts } from "./hourlyLobbyPolicy.js";

export const HOURLY_LOBBY_URL = "/api/casinoscores/lobby/hourly";

export function shouldReuseHourlyRequest(previous, accessKey, now = Date.now()) {
  if (!accessKey || previous?.accessKey !== accessKey || !Number.isFinite(previous?.at)) return false;
  const age = now - previous.at;
  const cooldown = (previous.failed ? 5 : 60) * 60 * 1000;
  return age >= 0 && age < cooldown && stockholmParts(previous.at).day === stockholmParts(now).day;
}

export function fetchHourlyLobbyBaseline(token, { signal } = {}) {
  return fetchAuthJson(token, HOURLY_LOBBY_URL, {
    cache: "no-store",
    signal,
  });
}
