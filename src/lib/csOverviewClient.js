'use client';

import { parseJsonResponse } from "@/lib/apiResponse";

const MEM_TTL_MS = 60 * 1000;
const memCache = new Map(); // key -> { data:any, exp:number }
const inFlight = new Map(); // key -> Promise<any>

export async function fetchOverviewShared(days) {
  return fetchOverviewSharedWithOptions(days, {});
}

export async function fetchOverviewSharedWithOptions(days, options = {}) {
  const key = String(Math.max(1, Math.floor(Number(days) || 1)));
  const force = Boolean(options?.force);
  const cacheKey = force ? `${key}:force` : key;
  const now = Date.now();

  const cached = memCache.get(cacheKey);
  if (cached && cached.exp > now) {
    return cached.data;
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const query = force ? `days=${key}&force=1` : `days=${key}`;
      const response = await fetch(`/api/casinoscores/lobby/overview?${query}`);
      const json = await parseJsonResponse(response);
      memCache.set(cacheKey, { data: json, exp: Date.now() + MEM_TTL_MS });
      return json;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
