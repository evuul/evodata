// Shared client resources for short-interest, trading activity and financial reports.

import { createClientJsonResource } from "./clientJsonResource.js";

export const DEFAULT_SHORT_ACTIVITY_DAYS = 45;
export const MIN_SHORT_ACTIVITY_DAYS = 7;
export const MAX_SHORT_ACTIVITY_DAYS = 365;

const shortSnapshotResources = new Map();
const shortActivityResources = new Map();

const shortHistoryResource = createClientJsonResource({
  url: "/api/short/history",
  cacheMs: 5 * 60 * 1000,
  timeoutMs: 8_000,
  retries: 1,
});

const financialReportsResource = createClientJsonResource({
  url: "/api/financial-reports",
  cacheMs: 60 * 60 * 1000,
  timeoutMs: 8_000,
  retries: 1,
});

export function normalizeShortActivityDays(days) {
  const parsed = Number.parseInt(days, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SHORT_ACTIVITY_DAYS;
  return Math.max(MIN_SHORT_ACTIVITY_DAYS, Math.min(MAX_SHORT_ACTIVITY_DAYS, parsed));
}

export function buildShortActivityUrl(days) {
  return `/api/short/activity?days=${normalizeShortActivityDays(days)}`;
}

export function buildShortSnapshotUrl(lei) {
  const normalizedLei = String(lei || "").trim();
  if (!normalizedLei) throw new Error("A LEI is required for short-interest requests");
  return `/api/short?lei=${encodeURIComponent(normalizedLei)}`;
}

function getShortSnapshotResource(lei) {
  const key = String(lei || "").trim();
  if (!shortSnapshotResources.has(key)) {
    shortSnapshotResources.set(key, createClientJsonResource({
      url: buildShortSnapshotUrl(key),
      cacheMs: 2 * 60 * 1000,
      timeoutMs: 8_000,
      retries: 1,
    }));
  }
  return shortSnapshotResources.get(key);
}

function getShortActivityResource(days) {
  const key = String(normalizeShortActivityDays(days));
  if (!shortActivityResources.has(key)) {
    shortActivityResources.set(key, createClientJsonResource({
      url: buildShortActivityUrl(key),
      cacheMs: 2 * 60 * 1000,
      timeoutMs: 10_000,
      retries: 1,
    }));
  }
  return shortActivityResources.get(key);
}

export async function loadMarketResource(resource, { force = false } = {}) {
  try {
    return await (force ? resource.refresh() : resource.load());
  } catch (error) {
    const staleData = resource.getSnapshot().data;
    if (staleData !== null) return staleData;
    throw error;
  }
}

export function fetchShortSnapshotPayloadShared(lei, { force = false } = {}) {
  return loadMarketResource(getShortSnapshotResource(lei), { force });
}

export function fetchShortHistoryPayloadShared({ force = false } = {}) {
  return loadMarketResource(shortHistoryResource, { force });
}

export function fetchShortActivityShared(days, { force = false } = {}) {
  return loadMarketResource(getShortActivityResource(days), { force });
}

export function fetchFinancialReportsShared({ force = false } = {}) {
  return loadMarketResource(financialReportsResource, { force });
}
