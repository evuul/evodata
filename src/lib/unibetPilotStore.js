// Persists the isolated Unibet pilot history without touching production lobby keys.

import { kvRestRequest } from "./kvClient.js";

export const UNIBET_PILOT_HISTORY_KEY = "pilot:unibet:history:v1";
export const UNIBET_PILOT_HISTORY_LIMIT = 672; // 14 days at one sample every 30 minutes.

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
}

export async function getUnibetPilotHistory(limit = 288) {
  const safeLimit = Math.min(Math.max(Math.round(Number(limit) || 1), 1), UNIBET_PILOT_HISTORY_LIMIT);
  const data = await request(
    `/lrange/${encodeURIComponent(UNIBET_PILOT_HISTORY_KEY)}/0/${safeLimit - 1}`
  );
  return (Array.isArray(data?.result) ? data.result : []).map(parseJson).filter(Boolean);
}
