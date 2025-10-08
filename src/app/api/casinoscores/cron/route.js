export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { fetchPlayersSnapshot } from "@/lib/fetchPlayersSnapshot";
import { buildSnapshotFromResults, storePlayerSnapshot } from "@/lib/playerSnapshotStore";

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
  const results = await fetchPlayersSnapshot({ origin, force: true, cronMode: true });

  const fetched = results.filter((r) => r.ok).length;

  if (fetched > 0) {
    try {
      const snapshot = buildSnapshotFromResults(
        results.map((r) => ({
          id: r.id,
          players: r.players,
          fetchedAt: r.fetchedAt,
          error: r.ok ? null : r.error,
        })),
        { source: "cron" }
      );
      await storePlayerSnapshot(snapshot);
    } catch (error) {
      results.push({
        id: "snapshot",
        slug: "snapshot",
        variant: null,
        status: 0,
        ok: false,
        players: null,
        fetchedAt: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: 0,
      });
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

export function GET() {
  return json({ ok: false, error: "Use POST with Authorization" }, 405, {
    Allow: "POST",
  });
}
