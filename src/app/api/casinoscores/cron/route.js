// src/app/api/casinoscores/cron/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";

// Enbart bas-slugs. Lägg till ":a" genom variant: "a" om/ när du vill.
const TARGETS = [
  { slug: "crazy-time" },
  { slug: "monopoly-big-baller" },
  { slug: "funky-time" },
  { slug: "lightning-storm" },
  { slug: "crazy-balls" },
  { slug: "ice-fishing" },
  { slug: "xxxtreme-lightning-roulette" },
  { slug: "monopoly-live" },
  { slug: "red-door-roulette" },
  { slug: "auto-roulette" },
  { slug: "speed-baccarat-a" },
  { slug: "super-andar-bahar" },
  { slug: "lightning-dice" },
  { slug: "lightning-roulette" },
  { slug: "bac-bo" },
  // Exempel på variant A om/ när du aktiverar:
  // { slug: "crazy-time", variant: "a" },
];

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

export async function POST(req) {
  if (!SECRET) {
    return json({ ok: false, error: "CASINOSCORES_CRON_SECRET is not configured" }, 500);
  }

  // Endast auktoriserad cron får köra detta
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${SECRET}`;
  if (authHeader !== expected) {
    return json({ ok: false, error: "Unauthorized" }, 401, {
      "WWW-Authenticate": "Bearer",
    });
  }

  const origin = new URL(req.url).origin;
  const results = [];

  for (const { slug, variant } of TARGETS) {
    const started = Date.now();
    try {
      // OBS: vi skickar med cron=1 så din /players/[game] vet att detta är en cron-körning.
      // Ingen force=1 behövs i lobby-first-flödet.
      const variantParam = variant && variant !== "default" ? `&variant=${encodeURIComponent(variant)}` : "";
      const url = `${origin}/api/casinoscores/players/${slug}?cron=1${variantParam}`;

      const res = await fetch(url, {
        cache: "no-store",
        headers: { authorization: expected },
      });

      let payload = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try { payload = await res.json(); } catch {}
      }

      const ok = payload?.ok === true;
      results.push({
        slug,
        variant: variant || "default",
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
        variant: variant || "default",
        status: 0,
        ok: false,
        players: null,
        fetchedAt: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
      });
    }
  }

  const fetched = results.filter(r => r.ok).length;
  return json({
    ok: fetched === results.length,
    fetched,
    total: TARGETS.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export function GET() {
  return json({ ok: false, error: "Use POST with Authorization" }, 405, {
    Allow: "POST",
  });
}