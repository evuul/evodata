'use client';

import { parseJsonResponse } from "@/lib/apiResponse";

const MEM_TTL_MS = 60 * 1000;
const memCache = new Map(); // key -> { data:any, exp:number }
const inFlight = new Map(); // key -> Promise<any>

export async function fetchOverviewShared(days) {
  const key = String(Math.max(1, Math.floor(Number(days) || 1)));
  const now = Date.now();

  const cached = memCache.get(key);
  if (cached && cached.exp > now) {
    return cached.data;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      const response = await fetch(`/api/casinoscores/lobby/overview?days=${key}`, {
        cache: "no-store",
      });
      const json = await parseJsonResponse(response);
      memCache.set(key, { data: json, exp: Date.now() + MEM_TTL_MS });
      return json;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
