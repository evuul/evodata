export const runtime = "nodejs";
export const revalidate = 300;
// Tips: När allt ser bra ut i prod, ta bort nästa rad för att tillåta cache:
// export const dynamic = "force-dynamic";

import { getSeries, dailyAverages } from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../../players/shared";

// ------------------------ config ------------------------
const ALLOWED = new Set(SERIES_SLUGS);
const TZ = "Europe/Stockholm";
const SERVER_TTL_MS = 1000 * 60 * 5; // 5 min server-memo cache
const S_MAXAGE_SECONDS = 300;        // 5 min CDN/browse-cache
const SWR_SECONDS = 86400;           // 24 h stale-while-revalidate

// -------------------- simple helpers -------------------
function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Viktigt: tillåt cache i browser/CDN (inte no-store)
      "Cache-Control": `public, s-maxage=${S_MAXAGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
      ...extra,
    },
  });
}

function makeEtag(obj) {
  // Snabb 32-bit hash på JSON
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `W/"${h.toString(16)}"`;
}

function todayYMD_SE() {
  try {
    const now = new Date();
    const y = now.toLocaleString("sv-SE", { timeZone: TZ, year: "numeric" });
    const m = now.toLocaleString("sv-SE", { timeZone: TZ, month: "2-digit" });
    const d = now.toLocaleString("sv-SE", { timeZone: TZ, day: "2-digit" });
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ---------------- in-memory cache + dedupe --------------
/** Key: `${slug}|${days}|${lite?1:0}` */
const memCache = new Map();  // key -> {expires:number, payload:any, etag:string}
const inFlight = new Map();  // key -> Promise<ResponsePayload>

function getCached(key) {
  const hit = memCache.get(key);
  if (hit && hit.expires > Date.now()) return hit;
  if (hit) memCache.delete(key);
  return null;
}

function setCached(key, payload, etag) {
  memCache.set(key, { expires: Date.now() + SERVER_TTL_MS, payload, etag });
}

// ------------------ main handler ------------------------
export async function GET(req, ctx) {
  try {
    // Next kan ge params som Promise i dynamiska routes; vänta in
    const paramsMaybe = ctx?.params;
    const params =
      paramsMaybe && typeof paramsMaybe.then === "function"
        ? await paramsMaybe
        : paramsMaybe || {};

    const slug = params.game; // t.ex. "crazy-time" eller "crazy-time:a"
    if (!ALLOWED.has(slug)) {
      return resJSON({ ok: false, error: "Unknown slug" }, 400);
    }

    const { searchParams } = new URL(req.url);
    const daysRaw = Number(searchParams.get("days") || 30);
    const days = Math.max(1, Math.min(365, Number.isFinite(daysRaw) ? daysRaw : 30));
    const lite = (searchParams.get("lite") ?? "1") !== "0"; // default true (mindre payload)

    const cacheKey = `${slug}|${days}|${lite ? 1 : 0}`;

    // 1) server-memo cache
    const cached = getCached(cacheKey);
    if (cached) {
      const inm = req.headers.get("if-none-match");
      if (inm && inm === cached.etag) {
        // Snabb 304
        return new Response(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            "Cache-Control": `public, s-maxage=${S_MAXAGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
          },
        });
      }
      return resJSON(cached.payload, 200, { ETag: cached.etag });
    }

    // 2) in-flight dedupe: om samma nyckel redan hämtas, återanvänd promisen
    if (inFlight.has(cacheKey)) {
      const reused = await inFlight.get(cacheKey);
      const inm = req.headers.get("if-none-match");
      if (inm && inm === reused.etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: reused.etag,
            "Cache-Control": `public, s-maxage=${S_MAXAGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
          },
        });
      }
      return resJSON(reused.payload, 200, { ETag: reused.etag });
    }

    // 3) göra själva jobbet (och lägg in i in-flight tills klart)
    const workPromise = (async () => {
      // Hämta mätpunkter (ASC)
      const allPoints = await getSeries(slug, days);

      // Specialfall: crazy-time:a – filtrera bort före reset
      const points =
        slug === "crazy-time:a"
          ? (allPoints || []).filter(
              (p) => Number.isFinite(p?.ts) && p.ts >= CRAZY_TIME_A_RESET_MS
            )
          : (allPoints || []);

      const latestPoint = points.length ? points[points.length - 1] : null;

      // Per-dag snitt (Europe/Stockholm)
      const dailyAll = dailyAverages(points) || [];

      // Filtrera bort dagens ofullständiga dag
      const today = todayYMD_SE();
      const daily = dailyAll.filter((row) => row.date < today);

      // Bygg payload – om lite mode, skippa tunga `points`
      const payload = lite
        ? {
            ok: true,
            slug,
            days,
            daily,
            latest: latestPoint?.value ?? null,
            latestTs: latestPoint ? new Date(latestPoint.ts).toISOString() : null,
          }
        : {
            ok: true,
            slug,
            days,
            points, // VARNING: stor payload. Använd bara om du måste.
            daily,
            latest: latestPoint?.value ?? null,
            latestTs: latestPoint ? new Date(latestPoint.ts).toISOString() : null,
          };

      // ETag beräknas på det vi exponerar (ej points i lite-läge)
      const etag = makeEtag({
        slug,
        days,
        daily,
        latest: payload.latest,
        latestTs: payload.latestTs,
        lite: !!lite,
      });

      // Memo-cache
      setCached(cacheKey, payload, etag);

      return { payload, etag };
    })();

    inFlight.set(cacheKey, workPromise);
    try {
      const { payload, etag } = await workPromise;
      const inm = req.headers.get("if-none-match");
      if (inm && inm === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            "Cache-Control": `public, s-maxage=${S_MAXAGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
          },
        });
      }
      return resJSON(payload, 200, { ETag: etag });
    } finally {
      inFlight.delete(cacheKey);
    }
  } catch (e) {
    return resJSON({ ok: false, error: String(e?.message || e) }, 500);
  }
}
