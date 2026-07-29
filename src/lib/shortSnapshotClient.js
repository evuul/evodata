// Shared client helpers for current short-interest snapshot and history.

import {
  fetchShortHistoryPayloadShared,
  fetchShortSnapshotPayloadShared,
} from "./marketDataClient.js";

export const EVO_LEI = "549300SUH6ZR1RF6TA88";

export function normalizeShortSnapshotResponse(payload) {
  if (payload?.totalPercent == null || payload?.totalPercent === "") {
    return null;
  }

  const totalPercent = Number(payload.totalPercent);
  if (!Number.isFinite(totalPercent)) {
    return null;
  }

  return {
    totalPercent,
    observedDate: typeof payload?.observedDate === "string" ? payload.observedDate : null,
  };
}

export function normalizeShortHistoryItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      date: item?.date,
      percent: Number(item?.percent),
    }))
    .filter((item) => item.date && Number.isFinite(item.percent))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchShortSnapshotDetails({
  lei = EVO_LEI,
  fetchImpl = globalThis.fetch,
  force = false,
} = {}) {
  let payload;
  let ok;
  if (fetchImpl === globalThis.fetch) {
    payload = await fetchShortSnapshotPayloadShared(lei, { force });
    ok = true;
  } else {
    const response = await fetchImpl(`/api/short?lei=${encodeURIComponent(lei)}`, { cache: "no-store" });
    payload = await readJson(response);
    ok = Boolean(response?.ok);
  }
  return {
    ok,
    payload,
    snapshot: normalizeShortSnapshotResponse(payload),
    publicPositions: Array.isArray(payload?.publicPositions) ? payload.publicPositions : [],
    publicPositionsError:
      typeof payload?.publicPositionsError === "string" && payload.publicPositionsError.trim()
        ? payload.publicPositionsError.trim()
        : "",
  };
}

export async function fetchShortHistory({ fetchImpl = globalThis.fetch, force = false } = {}) {
  let payload;
  let ok;
  if (fetchImpl === globalThis.fetch) {
    payload = await fetchShortHistoryPayloadShared({ force });
    ok = true;
  } else {
    const response = await fetchImpl("/api/short/history", { cache: "no-store" });
    payload = await readJson(response);
    ok = Boolean(response?.ok);
  }
  return {
    ok,
    payload,
    items: normalizeShortHistoryItems(payload?.items),
    updatedAt: payload?.updatedAt || null,
  };
}

export async function fetchLatestShortPercent({
  lei = EVO_LEI,
  fetchImpl = globalThis.fetch,
  force = false,
} = {}) {
  try {
    const details = await fetchShortSnapshotDetails({ lei, fetchImpl, force });
    if (details.ok && Number.isFinite(details.snapshot?.totalPercent)) {
      return {
        percent: details.snapshot.totalPercent,
        observedDate: details.snapshot.observedDate,
        source: "snapshot",
      };
    }
  } catch {
    // History remains a safe fallback when the live snapshot is unavailable.
  }

  const history = await fetchShortHistory({ fetchImpl, force });
  const latest = history.items.at(-1);
  if (latest && Number.isFinite(latest.percent)) {
    return {
      percent: latest.percent,
      observedDate: latest.date,
      source: "history",
    };
  }

  return null;
}
