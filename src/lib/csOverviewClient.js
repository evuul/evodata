'use client';

// Shares parameterized lobby overview requests across dashboard consumers.

import { createClientJsonResource } from "./clientJsonResource.js";

const resources = new Map();

export function normalizeOverviewDays(days) {
  const parsed = Number(days);
  if (!Number.isFinite(parsed)) return 45;
  return Math.max(7, Math.min(Math.floor(parsed), 365));
}

export function buildOverviewUrl(days, { founderAccess = false } = {}) {
  const access = founderAccess ? "&access=founder" : "";
  return `/api/casinoscores/lobby/overview?days=${normalizeOverviewDays(days)}${access}`;
}

export function getOverviewResource(days, { founderAccess = false } = {}) {
  const key = `${normalizeOverviewDays(days)}:${founderAccess ? "founder" : "standard"}`;
  if (!resources.has(key)) {
    resources.set(key, createClientJsonResource({
      url: buildOverviewUrl(days, { founderAccess }),
      cacheMs: 60 * 1000,
      timeoutMs: 10_000,
      retries: 1,
    }));
  }
  return resources.get(key);
}

export async function fetchOverviewShared(days) {
  return fetchOverviewSharedWithOptions(days, {});
}

export async function fetchOverviewSharedWithOptions(days, options = {}) {
  const force = Boolean(options?.force);
  const resource = getOverviewResource(days, { founderAccess: Boolean(options?.founderAccess) });
  return force ? resource.refresh() : resource.load();
}
