export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getSeries, dailyAverages } from "@/lib/csStore";

// Här ska både bas‐slugs OCH "crazy-time:a" vara med (API tillåter båda)
const ALLOWED = new Set([
  "crazy-time",
  "crazy-time:a", // <-- viktigt!
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
]);

const CRAZY_TIME_A_RESET_MS = Date.UTC(2025, 9, 11, 0, 0, 0); // 11 oktober 2025

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function makeEtag(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `W/"${h.toString(16)}"`;
}

export async function GET(req, ctx) {
  try {
    // Vänta in params (Next kan ge en Promise i dynamiska API:er)
    const paramsMaybe = ctx?.params;
    const params =
      paramsMaybe && typeof paramsMaybe.then === "function"
        ? await paramsMaybe
        : paramsMaybe || {};
    const slug = params.game; // kan vara "crazy-time" ELLER "crazy-time:a"

    if (!ALLOWED.has(slug)) {
      return resJSON({ ok: false, error: "Unknown slug" }, 400);
    }

    const { searchParams } = new URL(req.url);
    const daysRaw = Number(searchParams.get("days") || 30);
    const days = Math.max(1, Math.min(365, Number.isFinite(daysRaw) ? daysRaw : 30));

    // Hämta mätpunkter (ASC sorterad från csStore)
    const allPoints = await getSeries(slug, days);
    const points =
      slug === "crazy-time:a"
        ? allPoints.filter((p) => Number.isFinite(p?.ts) && p.ts >= CRAZY_TIME_A_RESET_MS)
        : allPoints;
    const latestPoint = points.length ? points[points.length - 1] : null;

    // Snitta per dag (Europe/Stockholm)
    const dailyAll = dailyAverages(points);

    // Filtrera bort dagens ofullständiga dag i Europe/Stockholm
    const now = new Date();
    const y = now.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric" });
    const m = now.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", month: "2-digit" });
    const d = now.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", day: "2-digit" });
    const todaySE = `${y}-${m}-${d}`;
    const daily = dailyAll.filter((row) => row.date < todaySE);

    const payload = {
      ok: true,
      slug,
      days,
      points,
      daily,
      latest: latestPoint?.value ?? null,
      latestTs: latestPoint ? new Date(latestPoint.ts).toISOString() : null,
    };
    const etag = makeEtag({
      slug,
      days,
      daily,
      latest: payload.latest,
      latestTs: payload.latestTs,
    });

    const inm = req.headers.get("if-none-match");
    if (inm && inm === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return resJSON(payload, 200, { ETag: etag });
  } catch (e) {
    return resJSON({ ok: false, error: String(e?.message || e) }, 500);
  }
}
