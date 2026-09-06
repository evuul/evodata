// Validates published game selections and gives each expanded selection a reproducible identity.

import { GAMES } from "../config/games.js";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { cohortSignature, HOURLY_BASELINE_SOURCE } from "./hourlyLobbyPolicy.js";

export function expandedHourlyCohort(gameIds, base = HOURLY_LOBBY_COHORT) {
  return { id: gameIds.length === base.gameIds.length ? base.id : `${base.id}-expanded-v1`, gameIds: [...gameIds].sort() };
}

export function publishedHourlyCohort(baseline, { base = HOURLY_LOBBY_COHORT, catalog = GAMES } = {}) {
  const cohort = baseline?.cohort;
  if (baseline?.source !== HOURLY_BASELINE_SOURCE || !Array.isArray(cohort?.gameIds)) return null;
  const allowed = new Set(catalog.map((game) => game.id));
  const selected = new Set(cohort.gameIds);
  if (selected.size !== cohort.gameIds.length || base.gameIds.some((id) => !selected.has(id))
      || cohort.gameIds.some((id) => !allowed.has(id))) return null;
  const expected = expandedHourlyCohort(cohort.gameIds, base);
  return cohort.id === expected.id && baseline.signature === cohortSignature(expected) ? cohort : null;
}
