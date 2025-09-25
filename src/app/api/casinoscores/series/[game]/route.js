export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getSeries, dailyAverages } from "@/lib/csStore";

// Här ska både bas‐slugs OCH "crazy-time:a" vara med
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
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `W/"${h.toString(16)}"`;
}

export async function GET(req, ctx) {
  try {
    // Vänta in params (Next kräver detta i dynamiska API:er)
    const paramsMaybe = ctx?.params;
    const params = (paramsMaybe && typeof paramsMaybe.then === "function")
      ? await paramsMaybe
      : paramsMaybe || {};
    const slug = params.game; // kan vara "crazy-time" ELLER "crazy-time:a"

    if (!ALLOWED.has(slug)) return resJSON({ ok: false, error: "Unknown slug" }, 400);

    const { searchParams } = new URL(req.url);
    const daysRaw = Number(searchParams.get("days") || 30);
    const days = Math.max(1, Math.min(365, Number.isFinite(daysRaw) ? daysRaw : 30));

    const points = await getSeries(slug, days);
    const daily = dailyAverages(points);

    const payload = { ok: true, slug, days, points, daily };
    const etag = makeEtag({ slug, days, daily });

    const inm = req.headers.get("if-none-match");
    if (inm && inm === etag) return new Response(null, { status: 304, headers: { ETag: etag } });

    return resJSON(payload, 200, { ETag: etag });
  } catch (e) {
    return resJSON({ ok: false, error: String(e?.message || e) }, 500);
  }
}