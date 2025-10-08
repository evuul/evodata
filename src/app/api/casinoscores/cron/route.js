export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { ALLOWED_SLUGS } from "../players/[game]/route";

const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";

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

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${SECRET}`;
  if (authHeader !== expected) {
    return json({ ok: false, error: "Unauthorized" }, 401, {
      "WWW-Authenticate": "Bearer",
    });
  }

  const origin = new URL(req.url).origin;
  const results = [];

  for (const slug of ALLOWED_SLUGS) {
    const started = Date.now();
    try {
      const url = `${origin}/api/casinoscores/players/${slug}?force=1&cron=1`;
      const res = await fetch(url, { cache: "no-store" });
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
  return json({
    ok: fetched === results.length,
    fetched,
    total: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export function GET() {
  return json({ ok: false, error: "Use POST with Authorization" }, 405, {
    Allow: "POST",
  });
}