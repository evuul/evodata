// src/app/api/casinoscores/players/latest/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Denna route läser ENBART cache (KV/in-memory) – ingen scraping.
// Cron-jobbet ansvarar för att fylla på nya samples.

import { getLatestSample } from "@/lib/csStore";

// Lista inkluderar även variant-slugs (t.ex. "crazy-time:a")
const SLUGS = [
  "crazy-time",
  // "crazy-time:a",
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
  "bac-bo"
];

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // CDN: cachea svaret i 30s, tillåt stale i 120s medan revalidate körs i bakgrunden
      "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      ...extra
    }
  });
}

export async function GET(req) {
  try {
    // Hämta samtliga parallellt (snabbare än sekventiellt)
    const rows = await Promise.all(
      SLUGS.map(async (id) => {
        const sample = await getLatestSample(id); // "slug" eller "slug:a" fungerar
        if (!sample) {
          return { id, players: null, fetchedAt: null, ageSeconds: null, _ts: 0 };
        }
        const ts = sample.ts;
        return {
          id,
          players: sample.value,
          fetchedAt: new Date(ts).toISOString(),
          ageSeconds: Math.max(0, Math.round((Date.now() - ts) / 1000)),
          _ts: ts
        };
      })
    );

    // Senaste timestamp över alla slugs
    const newestTs = rows.reduce((m, r) => Math.max(m, r._ts || 0), 0);
    const items = rows.map(({ _ts, ...rest }) => rest);

    // Bygg ETag på senaste timestamp (stabil och billig att jämföra)
    const etag = `W/"${newestTs.toString(16)}"`;

    // 304-support om klienten skickar If-None-Match
    const inm = req.headers.get("if-none-match");
    if (inm && inm === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "s-maxage=30, stale-while-revalidate=120" }
      });
    }

    return resJSON(
      {
        ok: true,
        items,
        updatedAt: newestTs ? new Date(newestTs).toISOString() : null
      },
      200,
      { ETag: etag }
    );
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}