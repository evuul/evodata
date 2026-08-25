export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestPlayersSnapshot, getLatestSample, getSeriesBulk } from "@/lib/csStore";
import { computeTrailingStuckMeta } from "@/lib/stuckGames";
import { normalizeLatestPlayerSnapshotItem } from "@/lib/livePlayerSnapshot";
import { applyUnibetPilotFallback } from "@/lib/unibetPilotFallback";
import {
  getLatestSuccessfulUnibetPilotSample,
  getLatestUnibetPilotSample,
} from "@/lib/unibetPilotStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../shared";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";
const STUCK_LOOKBACK_DAYS = 90;
const STUCK_MIN_RUN = 4;
const STUCK_MIN_DAYS = 0;

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET() {
  try {
    const snapshot = await getLatestPlayersSnapshot();
    if (snapshot?.items && Array.isArray(snapshot.items)) {
      const now = Date.now();
      let items = snapshot.items.map((item) => normalizeLatestPlayerSnapshotItem(item, now));
      let recoveryUpdatedAt = null;
      if (items.some((item) => item.stuck || item.players == null)) {
        try {
          const latest = await getLatestUnibetPilotSample();
          const sample = latest?.status === "ok"
            ? latest
            : await getLatestSuccessfulUnibetPilotSample();
          const recovered = applyUnibetPilotFallback(items, sample, { now, allowMissing: true });
          items = recovered.items;
          recoveryUpdatedAt = recovered.applied.length ? sample?.collectedAt ?? null : null;
        } catch {
          // The materialized primary snapshot remains usable if recovery storage is unavailable.
        }
      }
      const snapshotUpdatedAt = Date.parse(String(snapshot?.updatedAt || ""));
      const recoveredUpdatedAt = Date.parse(String(recoveryUpdatedAt || ""));
      const updatedAt = Number.isFinite(recoveredUpdatedAt)
        && (!Number.isFinite(snapshotUpdatedAt) || recoveredUpdatedAt > snapshotUpdatedAt)
        ? recoveryUpdatedAt
        : snapshot?.updatedAt || null;
      return resJSON({
        ok: true,
        items,
        updatedAt,
        source: "latest-snapshot",
      });
    }

    const seriesMap = await getSeriesBulk(SERIES_SLUGS, STUCK_LOOKBACK_DAYS).catch(() => new Map());
    const items = [];
    let newestTs = 0;

    for (const slug of SERIES_SLUGS) {
      const sample = await getLatestSample(slug);
      const usable =
        slug === "crazy-time:a" && sample && sample.ts < CRAZY_TIME_A_RESET_MS
          ? null
          : sample;
      if (usable) {
        newestTs = Math.max(newestTs, usable.ts);
        items.push({
          id: slug,
          players: usable.value,
          fetchedAt: new Date(usable.ts).toISOString(),
          ageSeconds: Math.max(0, Math.round((Date.now() - usable.ts) / 1000)),
        });
      } else {
        items.push({ id: slug, players: null, fetchedAt: null, ageSeconds: null });
      }
    }

    for (const item of items) {
      const stuckMeta = computeTrailingStuckMeta(seriesMap.get(item.id) ?? [], {
        minRun: STUCK_MIN_RUN,
        minDays: STUCK_MIN_DAYS,
      });
      if (stuckMeta) {
        item.stuck = true;
        item.stuckDays = stuckMeta.stuckDays;
        item.stuckSince = stuckMeta.stuckSince;
        item.stuckLatestAt = stuckMeta.stuckLatestAt;
        item.stuckValue = stuckMeta.stuckValue;
        item.stuckRunLength = stuckMeta.stuckRunLength;
      } else {
        item.stuck = false;
        item.stuckDays = null;
        item.stuckSince = null;
        item.stuckLatestAt = null;
        item.stuckValue = null;
        item.stuckRunLength = 0;
      }
    }

    return resJSON({
      ok: true,
      items,
      updatedAt: newestTs ? new Date(newestTs).toISOString() : null,
    });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
