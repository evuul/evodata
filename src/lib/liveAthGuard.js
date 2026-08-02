// Selects fresh live values that can raise an existing per-game ATH snapshot.

import { normalizeGameAthSnapshot } from "./gameAthSnapshot.js";

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function selectLiveAthCandidates(snapshotValue, items) {
  const snapshot = normalizeGameAthSnapshot(snapshotValue);
  const games = snapshot?.games ?? {};

  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = typeof item?.id === "string" ? item.id : "";
    const players = toFiniteNumber(item?.players);
    if (!id || item?.stale || players == null || players < 0 || !item?.fetchedAt) return false;

    const currentAth = toFiniteNumber(games[id]?.value);
    return currentAth == null || players > currentAth;
  });
}
