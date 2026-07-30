// Runs the authenticated bulk player refresh and materializes read-optimized snapshots.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import {
  getGlobalLobbyAth,
  getLatestPlayersSnapshot,
  getSeriesBulk,
  maybeUpdateDailyLobbyPeak,
  setGlobalLobbyAth,
  setLatestPlayersSnapshot,
  updateGameAthSnapshot,
} from "@/lib/csStore";
import { computeTrailingStuckMeta } from "@/lib/stuckGames";
import { shouldSkipMaterializedRefresh } from "@/lib/upstashCostPolicy";
import { CRON_TARGETS } from "../players/shared";

const SECRET = resolveCronSecret(process.env.CASINOSCORES_CRON_SECRET, process.env.CRON_SECRET);
const STUCK_LOOKBACK_DAYS = 90;
const STUCK_MIN_RUN = 8;
const CRON_MIN_INTERVAL_MS = (() => {
  const configured = Number(process.env.CS_CRON_MIN_INTERVAL_MS);
  if (!Number.isFinite(configured) || configured <= 0) return 20 * 60 * 1000;
  return Math.min(Math.max(configured, 60 * 1000), 60 * 60 * 1000);
})();

const targetId = ({ slug, variant = "default" }) =>
  `${slug}${variant === "a" ? ":a" : ""}`;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

async function runCron(req) {
  const auth = requireCronAuth(req, SECRET, "CASINOSCORES_CRON_SECRET is not configured");
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status, {
      "WWW-Authenticate": auth.status === 401 ? "Bearer" : undefined,
    });
  }

  const previousSnapshot = await getLatestPlayersSnapshot().catch(() => null);
  if (shouldSkipMaterializedRefresh({
    materializedAt: previousSnapshot?.materializedAt,
    minIntervalMs: CRON_MIN_INTERVAL_MS,
  })) {
    return json({
      ok: true,
      skipped: true,
      reason: "Refresh interval has not elapsed",
      materializedAt: previousSnapshot.materializedAt,
      minIntervalMs: CRON_MIN_INTERVAL_MS,
    });
  }

  const origin = new URL(req.url).origin;
  const results = [];

  for (const { slug, variant = "default" } of CRON_TARGETS) {
    const started = Date.now();
    try {
      const params = new URLSearchParams({ force: "1", cron: "1" });
      if (variant && variant !== "default") params.set("variant", variant);
      const url = `${origin}/api/casinoscores/players/${slug}?${params.toString()}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "x-cs-cron-secret": SECRET,
        },
      });
      let payload = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      }

      const ok = payload?.ok === true;
      results.push({
        slug,
        variant,
        status: res.status,
        ok,
        players: payload?.players ?? null,
        fetchedAt: payload?.fetchedAt ?? null,
        error: ok ? undefined : payload?.error || res.statusText || "Unknown error",
        durationMs: Date.now() - started,
      });
    } catch (error) {
      results.push({
        slug,
        variant,
        status: 0,
        ok: false,
        players: null,
        fetchedAt: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
      });
    }
  }

  const fetched = results.filter((r) => r.ok).length;
  const successfulItems = results
    .filter((result) => result.ok && Number.isFinite(Number(result.players)) && result.fetchedAt)
    .map((result) => ({
      id: targetId(result),
      players: Number(result.players),
      fetchedAt: result.fetchedAt,
    }));

  if (successfulItems.length) {
    const ids = CRON_TARGETS.map(targetId);
    const seriesMap = await getSeriesBulk(ids, STUCK_LOOKBACK_DAYS).catch(() => new Map());
    const previousById = new Map(
      Array.isArray(previousSnapshot?.items)
        ? previousSnapshot.items.filter((item) => item?.id).map((item) => [item.id, item])
        : []
    );
    const freshById = new Map(successfulItems.map((item) => [item.id, item]));

    const snapshotItems = ids.map((id) => {
      const item = freshById.get(id) ?? previousById.get(id) ?? { id, players: null, fetchedAt: null };
      const stuck = computeTrailingStuckMeta(seriesMap.get(id) ?? [], { minRun: STUCK_MIN_RUN });
      return {
        id,
        players: Number.isFinite(Number(item.players)) ? Number(item.players) : null,
        fetchedAt: item.fetchedAt ?? null,
        stuck: Boolean(stuck),
        stuckDays: stuck?.stuckDays ?? null,
        stuckSince: stuck?.stuckSince ?? null,
        stuckLatestAt: stuck?.stuckLatestAt ?? null,
        stuckValue: stuck?.stuckValue ?? null,
        stuckRunLength: stuck?.stuckRunLength ?? 0,
      };
    });
    const updatedAt = successfulItems
      .map((item) => item.fetchedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? new Date().toISOString();

    const materializedAt = new Date().toISOString();
    await Promise.all([
      setLatestPlayersSnapshot({ items: snapshotItems, updatedAt, materializedAt }),
      updateGameAthSnapshot(successfulItems, updatedAt),
    ]);

    const stuckIds = new Set(snapshotItems.filter((item) => item.stuck).map((item) => item.id));
    const totalPlayers = successfulItems.reduce(
      (sum, item) => (stuckIds.has(item.id) ? sum : sum + item.players),
      0
    );
    const newestTimestamp = Date.parse(updatedAt);
    if (totalPlayers > 0 && Number.isFinite(newestTimestamp)) {
      try {
        const updatedPeak = await maybeUpdateDailyLobbyPeak(totalPlayers, newestTimestamp);
        const existingAth = await getGlobalLobbyAth();
        if (!Number.isFinite(Number(existingAth?.value)) || totalPlayers > Number(existingAth.value)) {
          await setGlobalLobbyAth({
            value: totalPlayers,
            date: updatedPeak?.date ?? updatedAt.slice(0, 10),
            at: updatedAt,
          });
        }
      } catch {
        // Snapshot freshness is more important than optional peak metadata.
      }
    }
  }

  return json({
    ok: fetched === results.length,
    fetched,
    total: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req) {
  return runCron(req);
}

export async function GET(req) {
  return runCron(req);
}
