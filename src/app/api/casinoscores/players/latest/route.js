export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestPlayersSnapshot, getLatestSample, getSeriesBulk } from "@/lib/csStore";
import { computeTrailingStuckMeta } from "@/lib/stuckGames";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../shared";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";
const STUCK_LOOKBACK_DAYS = 90;
const STUCK_MIN_RUN = 8;

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
      const items = snapshot.items.map((item) => {
        const ts = Date.parse(String(item?.fetchedAt || ""));
        return {
          id: item?.id || null,
          players: Number.isFinite(Number(item?.players)) ? Number(item.players) : null,
          fetchedAt: item?.fetchedAt || null,
          ageSeconds: Number.isFinite(ts) ? Math.max(0, Math.round((now - ts) / 1000)) : null,
          stuck: Boolean(item?.stuck),
          stuckDays: Number.isFinite(Number(item?.stuckDays)) ? Math.max(1, Math.round(Number(item.stuckDays))) : null,
          stuckSince: item?.stuckSince || null,
          stuckLatestAt: item?.stuckLatestAt || null,
          stuckValue: Number.isFinite(Number(item?.stuckValue)) ? Math.round(Number(item.stuckValue)) : null,
          stuckRunLength: Number.isFinite(Number(item?.stuckRunLength)) ? Math.round(Number(item.stuckRunLength)) : null,
        };
      });
      return resJSON({
        ok: true,
        items,
        updatedAt: snapshot?.updatedAt || null,
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
      const stuckMeta = computeTrailingStuckMeta(seriesMap.get(item.id) ?? [], { minRun: STUCK_MIN_RUN });
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
