// Coordinates Unibet history writes with the primary-feed fallback for stuck games.

import { applyUnibetPilotFallback } from "./unibetPilotFallback.js";

export const RECOVERY_HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

export function selectUnibetRecoverySeriesItems(snapshotItems, sample, options = {}) {
  return applyUnibetPilotFallback(snapshotItems, sample, options).applied;
}

export function buildRecoveredLatestPlayersSnapshot(snapshot, sample, options = {}) {
  if (!snapshot || !Array.isArray(snapshot.items)) {
    return { snapshot: null, applied: [] };
  }

  const repaired = applyUnibetPilotFallback(snapshot.items, sample, options);
  if (!repaired.applied.length) {
    return { snapshot, applied: [] };
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const existingUpdatedAt = Date.parse(String(snapshot.updatedAt || ""));
  const recoveryUpdatedAt = Date.parse(String(sample?.collectedAt || ""));
  const updatedAt = Number.isFinite(recoveryUpdatedAt)
    && (!Number.isFinite(existingUpdatedAt) || recoveryUpdatedAt > existingUpdatedAt)
    ? new Date(recoveryUpdatedAt).toISOString()
    : snapshot.updatedAt ?? null;

  return {
    snapshot: {
      ...snapshot,
      items: repaired.items,
      updatedAt,
      materializedAt: new Date(now).toISOString(),
    },
    applied: repaired.applied,
  };
}

export function partitionPrimarySeriesItems(
  primaryItems,
  snapshotItems,
  sample,
  { now = Date.now(), maxAgeMs = RECOVERY_HANDOFF_MAX_AGE_MS } = {}
) {
  const persistedIds = new Set(
    Array.isArray(sample?.seriesSavedGameIds) ? sample.seriesSavedGameIds.filter(Boolean) : []
  );
  const recoveryItems = selectUnibetRecoverySeriesItems(snapshotItems, sample, { now, maxAgeMs })
    .filter((item) => persistedIds.has(item.id));
  const recoveredIds = new Set(recoveryItems.map((item) => item.id));
  const snapshotById = new Map(
    (Array.isArray(snapshotItems) ? snapshotItems : [])
      .filter((item) => item?.id)
      .map((item) => [item.id, item])
  );
  const primary = [];
  const deferred = [];

  for (const item of Array.isArray(primaryItems) ? primaryItems : []) {
    const previous = snapshotById.get(item?.id);
    const stuckValue = Number(previous?.stuckValue ?? previous?.players);
    const primaryValue = Number(item?.players);
    const primaryStillFrozen =
      previous?.stuck && Number.isFinite(stuckValue) && primaryValue === stuckValue;
    (recoveredIds.has(item?.id) && primaryStillFrozen ? deferred : primary).push(item);
  }

  return { primary, deferred, recoveryItems };
}

export async function persistRecoverySeriesItems(items, saveSampleImpl) {
  if (typeof saveSampleImpl !== "function") throw new TypeError("saveSampleImpl must be a function");

  const results = await Promise.allSettled(
    (Array.isArray(items) ? items : []).map((item) =>
      saveSampleImpl(item.id, item.fetchedAt, item.players)
    )
  );

  const sourceItems = Array.isArray(items) ? items : [];
  const savedGameIds = [];
  const failedGameIds = [];
  results.forEach((result, index) => {
    const target = result.status === "fulfilled" ? savedGameIds : failedGameIds;
    const id = sourceItems[index]?.id;
    if (id) target.push(id);
  });

  return { savedGameIds, failedGameIds };
}
