// Shares live top-win requests across login, header and detailed dashboard views.

import { createClientJsonResource } from "./clientJsonResource.js";
import {
  LIVE_TOP3_DEFAULT_HISTORY_DAYS,
  LIVE_TOP3_DEFAULT_HISTORY_PER_DAY,
  buildLiveTop3CacheKey,
  normalizeLiveTop3Options,
} from "./liveTop3Request.js";

const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const resources = new Map();

export function buildLiveTop3Url(options = {}) {
  const normalized = normalizeLiveTop3Options(options, {
    historyDays: LIVE_TOP3_DEFAULT_HISTORY_DAYS,
    historyPerDay: LIVE_TOP3_DEFAULT_HISTORY_PER_DAY,
  });
  const params = new URLSearchParams({
    historyDays: String(normalized.historyDays),
    historyPerDay: String(normalized.historyPerDay),
  });
  return `${LIVE_TOP3_ENDPOINT}?${params.toString()}`;
}

export function getLiveTop3Resource(options = {}) {
  const normalized = normalizeLiveTop3Options(options, {
    historyDays: LIVE_TOP3_DEFAULT_HISTORY_DAYS,
    historyPerDay: LIVE_TOP3_DEFAULT_HISTORY_PER_DAY,
  });
  const key = buildLiveTop3CacheKey(normalized);
  if (!resources.has(key)) {
    resources.set(key, createClientJsonResource({
      url: buildLiveTop3Url(normalized),
      cacheMs: 5 * 60 * 1000,
      timeoutMs: 8_000,
      retries: 1,
    }));
  }
  return resources.get(key);
}

export function fetchLiveTop3Shared(options = {}, { force = false } = {}) {
  const resource = getLiveTop3Resource(options);
  return force ? resource.refresh() : resource.load();
}
