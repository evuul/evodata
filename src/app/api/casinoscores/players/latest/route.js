export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { fetchPlayersSnapshot } from "@/lib/fetchPlayersSnapshot";
import { getLatestSample } from "@/lib/csStore";
import {
  buildSnapshotFromResults,
  loadPlayerSnapshot,
  snapshotIsStale,
  storePlayerSnapshot,
} from "@/lib/playerSnapshotStore";

const FALLBACK_SLUGS = [
  "crazy-time",
  "crazy-time:a",
  "monopoly-big-baller",
  "funky-time",
  "lightning-storm",
  "crazy-balls",
  "ice-fishing",
  "xxxtreme-lightning-roulette",
  "monopoly-live",
  "red-door-roulette",
  "auto-roulette",
  "speed-baccarat-a",
  "super-andar-bahar",
  "lightning-dice",
  "lightning-roulette",
  "bac-bo",
];

const MAX_STALE_MS = 10 * 60 * 1000; // 10 min

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function buildFallbackFromKv() {
  const items = [];
  let newestTs = 0;

  for (const slug of FALLBACK_SLUGS) {
    const sample = await getLatestSample(slug);
    if (sample) {
      newestTs = Math.max(newestTs, sample.ts);
      items.push({
        id: slug,
        players: sample.value,
        fetchedAt: new Date(sample.ts).toISOString(),
        ageSeconds: Math.max(0, Math.round((Date.now() - sample.ts) / 1000)),
        error: null,
      });
    } else {
      items.push({ id: slug, players: null, fetchedAt: null, ageSeconds: null, error: "missing" });
    }
  }

  return {
    ok: true,
    items,
    updatedAt: newestTs ? new Date(newestTs).toISOString() : null,
    trackedTotal: items.reduce((sum, item) => (Number.isFinite(item.players) ? sum + item.players : sum), 0),
    trackedCount: items.filter((item) => Number.isFinite(item.players)).length,
    source: "kv-fallback",
  };
}

export async function GET(req) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const origin = url.origin;

  try {
    let snapshot = await loadPlayerSnapshot();
    const stale = snapshotIsStale(snapshot, MAX_STALE_MS);

    if (refresh || !snapshot || stale) {
      const results = await fetchPlayersSnapshot({
        origin,
        force: refresh || !snapshot,
        cronMode: refresh,
      });

      const successCount = results.filter((r) => r.ok).length;
      if (successCount > 0) {
        snapshot = buildSnapshotFromResults(
          results.map((r) => ({
            id: r.id,
            players: r.players,
            fetchedAt: r.fetchedAt,
            error: r.ok ? null : r.error,
          })),
          {
            source: refresh ? "manual-refresh" : !snapshot ? "warmup" : "auto-refresh",
          }
        );
        await storePlayerSnapshot(snapshot);
      } else if (!snapshot) {
        snapshot = null;
      }
    }

    if (!snapshot) {
      return resJSON(await buildFallbackFromKv());
    }

    const items = Object.entries(snapshot.items || {}).map(([id, entry]) => ({
      id,
      players: Number.isFinite(entry?.players) ? entry.players : null,
      fetchedAt: entry?.fetchedAt || null,
      ageSeconds: entry?.fetchedAt ? Math.max(0, Math.round((Date.now() - Date.parse(entry.fetchedAt)) / 1000)) : null,
      error: entry?.error || null,
    }));

    return resJSON({
      ok: true,
      items,
      updatedAt: snapshot.updatedAt,
      trackedTotal: snapshot.trackedTotal,
      trackedCount: snapshot.trackedCount,
      source: snapshot.meta?.source || "snapshot",
    });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
