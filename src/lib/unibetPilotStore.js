// Persists short-lived Unibet recovery history separately from the primary lobby snapshots.

import { kvRestRequest } from "./kvClient.js";

export const UNIBET_PILOT_HISTORY_KEY = "pilot:unibet:history:v1";
export const UNIBET_PILOT_HISTORY_LIMIT = 2_016; // 14 days at one sample every 10 minutes.
const LATEST_SAMPLE_CACHE_MS = 30 * 1000;
let latestSampleCache = { value: null, expiresAt: 0 };

const request = (path, init = {}) =>
  kvRestRequest(path, init, {
    errorCodePrefix: "UNIBET_PILOT_UPSTASH",
    missingCode: "UNIBET_PILOT_MISSING_UPSTASH_ENV",
    serviceName: "Unibet pilot",
  });

const parseJson = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

export async function appendUnibetPilotSample(sample) {
  await request("/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      ["LPUSH", UNIBET_PILOT_HISTORY_KEY, JSON.stringify(sample)],
      ["LTRIM", UNIBET_PILOT_HISTORY_KEY, "0", String(UNIBET_PILOT_HISTORY_LIMIT - 1)],
    ]),
  });
  latestSampleCache = {
    value: sample || null,
    expiresAt: Date.now() + LATEST_SAMPLE_CACHE_MS,
  };
}

export async function getUnibetPilotHistory(limit = 288) {
  const safeLimit = Math.min(Math.max(Math.round(Number(limit) || 1), 1), UNIBET_PILOT_HISTORY_LIMIT);
  const data = await request(
    `/lrange/${encodeURIComponent(UNIBET_PILOT_HISTORY_KEY)}/0/${safeLimit - 1}`
  );
  return (Array.isArray(data?.result) ? data.result : []).map(parseJson).filter(Boolean);
}

export async function getLatestUnibetPilotSample() {
  if (latestSampleCache.expiresAt > Date.now()) return latestSampleCache.value;
  const [sample] = await getUnibetPilotHistory(1);
  latestSampleCache = {
    value: sample || null,
    expiresAt: Date.now() + LATEST_SAMPLE_CACHE_MS,
  };
  return latestSampleCache.value;
}
