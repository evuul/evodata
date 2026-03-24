export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { loadShortHistory, saveShortHistory } from "@/lib/shortHistoryStore";

const EVO_LEI = "549300SUH6ZR1RF6TA88";
const OUTLIER_WINDOW_DAYS = 10;
const OUTLIER_BAND_MARGIN_PP = 0.75;
const OUTLIER_MIN_DELTA_PP = 1.5;

function parsePercent(s) {
  if (s == null) return null;
  const t = String(s).replace(/\u00A0/g, " ").replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EvoTrackerBot/1.0)",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "Referer": "https://www.fi.se/sv/vara-register/blankningsregistret/",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

function extractTotalPercent(html, lei) {
  try {
    const re = new RegExp(`<td\\s*>${lei}<\\/td>[\\s\\S]*?<td[^>]*class=['"]numeric['"][^>]*>(.*?)<\\/td>`, "i");
    const m = re.exec(html);
    if (m) return parsePercent(m[1]);
  } catch {}
  return null;
}

function extractTotalPercentFromEmittent(html) {
  try {
    const re = /<td>\s*Summa procent\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i;
    const m = re.exec(html);
    if (m) return parsePercent(m[1]);
  } catch {}
  return null;
}

function stockholmYMD(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(d);
    const y = parts.find(p => p.type === "year")?.value ?? "0000";
    const m = parts.find(p => p.type === "month")?.value ?? "00";
    const day = parts.find(p => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

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

export async function POST() {
  try {
    const emittentUrl = `https://www.fi.se/sv/vara-register/blankningsregistret/emittent?id=${encodeURIComponent(
      EVO_LEI
    )}`;
    const emittentHtml = await fetchText(emittentUrl);
    let total = extractTotalPercentFromEmittent(emittentHtml);

    if (total == null) {
      const listHtml = await fetchText("https://www.fi.se/sv/vara-register/blankningsregistret/");
      total = extractTotalPercent(listHtml, EVO_LEI);
    }

    if (total == null) {
      return new Response(JSON.stringify({ error: "Could not extract total percent" }), { status: 422 });
    }

    const today = stockholmYMD();
    const history = await loadShortHistory();

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
      JSON.stringify({ ok: true, ignored: false, date: today, percent: value, totalDays: saved.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

// (valfritt) Låt GET också trigga snapshot
export async function GET() { return POST(); }
