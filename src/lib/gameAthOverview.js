// Reconciles materialized per-game ATH records with lobby overview responses.

import { normalizeGameAthSnapshot } from "./gameAthSnapshot.js";

const normalizeOverviewAth = (value) => {
  const players = Number(value?.value);
  if (!Number.isFinite(players) || players < 0) return null;
  return {
    value: Math.round(players),
    at: typeof value?.at === "string" ? value.at : null,
  };
};

export function mergeGameAthIntoOverview(payload, snapshotValue) {
  if (!payload || typeof payload !== "object") return payload;
  const snapshot = normalizeGameAthSnapshot(snapshotValue);
  if (!snapshot || !Object.keys(snapshot.games).length) return payload;

  const details = Array.isArray(payload.slugDetails) ? payload.slugDetails : [];
  const seen = new Set();
  let changed = false;
  const mergedDetails = details.map((detail) => {
    const slug = typeof detail?.slug === "string" ? detail.slug : "";
    if (!slug) return detail;
    seen.add(slug);

    const storedAth = normalizeOverviewAth(detail?.ath);
    const snapshotAth = normalizeOverviewAth(snapshot.games[slug]);
    if (!snapshotAth || (storedAth && storedAth.value >= snapshotAth.value)) return detail;

    changed = true;
    return { ...detail, ath: snapshotAth };
  });

  for (const [slug, entry] of Object.entries(snapshot.games)) {
    if (seen.has(slug)) continue;
    const ath = normalizeOverviewAth(entry);
    if (!ath) continue;
    mergedDetails.push({ slug, latest: null, ath });
    changed = true;
  }

  return changed ? { ...payload, slugDetails: mergedDetails } : payload;
}
