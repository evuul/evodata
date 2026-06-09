export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { loadShortHistory, saveShortHistory } from "@/lib/shortHistoryStore";
import { EVO_LEI } from "@/lib/fiShortRegister";
import { resolveFiShortSnapshot, stockholmYmd } from "@/lib/fiShortSnapshot";

const OUTLIER_WINDOW_DAYS = 10;
const OUTLIER_BAND_MARGIN_PP = 0.75;
const OUTLIER_MIN_DELTA_PP = 1.5;

function getRecentEntries(history, today, limit = OUTLIER_WINDOW_DAYS) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry) => entry?.date && entry.date < today && Number.isFinite(Number(entry?.percent)))
    .slice(-Math.max(1, limit));
}

function computeRecentMaxDelta(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return 0;
  let maxDelta = 0;
  for (let i = 1; i < entries.length; i += 1) {
    const prev = Number(entries[i - 1]?.percent);
    const next = Number(entries[i]?.percent);
    if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
    maxDelta = Math.max(maxDelta, Math.abs(next - prev));
  }
  return maxDelta;
}

function detectOutlier(history, today, value) {
  const recent = getRecentEntries(history, today);
  if (!recent.length || !Number.isFinite(value)) return null;

  const previous = recent[recent.length - 1];
  const previousPercent = Number(previous?.percent);
  if (!Number.isFinite(previousPercent)) return null;

  const recentPercents = recent
    .map((entry) => Number(entry?.percent))
    .filter((percent) => Number.isFinite(percent));
  if (!recentPercents.length) return null;

  const recentMin = Math.min(...recentPercents);
  const recentMax = Math.max(...recentPercents);
  const outsideRecentBand =
    value < recentMin - OUTLIER_BAND_MARGIN_PP ||
    value > recentMax + OUTLIER_BAND_MARGIN_PP;

  const deltaFromPrevious = Math.abs(value - previousPercent);
  const recentMaxDelta = computeRecentMaxDelta(recent);
  const allowedDelta = Math.max(OUTLIER_MIN_DELTA_PP, recentMaxDelta * 3);

  if (!outsideRecentBand || deltaFromPrevious <= allowedDelta) {
    return null;
  }

  return {
    previousDate: previous.date,
    previousPercent: previousPercent,
    deltaFromPrevious: +deltaFromPrevious.toFixed(2),
    recentMin: +recentMin.toFixed(2),
    recentMax: +recentMax.toFixed(2),
    allowedDelta: +allowedDelta.toFixed(2),
  };
}

function shouldForceRefresh(request) {
  try {
    const { searchParams } = new URL(request.url);
    return searchParams.get("force") === "1" || searchParams.get("force") === "true";
  } catch {
    return false;
  }
}

export async function POST(request) {
  let history = [];
  const today = stockholmYMD();
  try {
    history = await loadShortHistory();
    const force = shouldForceRefresh(request);
    const {
      totalPercent: total,
      publicPercent,
      publicPositions,
      observedDate,
      fetchedAt,
      cached,
      stale,
    } = await resolveFiShortSnapshot({ lei: EVO_LEI, force });

    if (total == null) {
      return new Response(
        JSON.stringify({
          ok: false,
          refreshed: false,
          date: today,
          percent: null,
          totalDays: history.length,
          error: "Could not extract total percent",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const value = +Number(total).toFixed(2);
    const outlier = detectOutlier(history, today, value);
    if (outlier) {
      return new Response(
        JSON.stringify({
          ok: true,
          ignored: true,
          date: today,
          percent: value,
          reason: "suspected_stale_fi_value",
          baseline: outlier,
          totalDays: Array.isArray(history) ? history.length : 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const next = Array.isArray(history) ? [...history] : [];
    const idx = next.findIndex(entry => entry.date === today);
    const updated = { date: today, percent: value };
    if (idx >= 0) {
      next[idx] = updated;
    } else {
      next.push(updated);
    }

    const saved = await saveShortHistory(next);

    return new Response(
      JSON.stringify({
        ok: true,
        ignored: false,
        date: today,
        percent: value,
        publicPercent: Number.isFinite(publicPercent) ? publicPercent : null,
        publicPositions: Array.isArray(publicPositions) ? publicPositions : [],
        observedDate: observedDate ?? today,
        fetchedAt: fetchedAt ?? null,
        cached: Boolean(cached),
        stale: Boolean(stale),
        totalDays: saved.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        ok: false,
        refreshed: false,
        date: today,
        percent: null,
        totalDays: history.length,
        error: message,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// (valfritt) Låt GET också trigga snapshot
export async function GET(request) { return POST(request); }
