export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

import { getLatestSample, normalizePlayers } from "@/lib/csStore";
import { CRON_TARGETS, lobbyKeyFor, fetchLobbyCounts } from "@/lib/casinoscores/lobby";

const TARGETS = CRON_TARGETS;

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      ...extra,
    },
  });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";

    // 1) Försök lobby snabbt (2.5s timeout). Misslyckas den → sätt lobby=null direkt
    let lobby = null;
    try {
      lobby = await fetchLobbyCounts(force, 2500);
    } catch {
      lobby = null;
    }

    // 2) Bygg rader
    const rows = await Promise.all(
      TARGETS.map(async ({ slug, variant = "default" }) => {
        const id = `${slug}${variant === "a" ? ":a" : ""}`;
        let players = null;
        let fetchedAt = null;

        // Lobby först
        if (lobby) {
          const key = lobbyKeyFor(slug, variant);
          if (key) {
            const raw = lobby?.gameShowPlayerCounts?.[key];
            const norm = normalizePlayers(raw);
            if (norm != null) {
              players = norm;
              fetchedAt = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null;
            }
          }
        }

        // Fallback till KV
        if (!Number.isFinite(players)) {
          const sample = await getLatestSample(id).catch(() => null);
          if (sample) {
            players = sample.value;
            fetchedAt = new Date(sample.ts).toISOString();
          }
        }

        if (Number.isFinite(players)) {
          const ts = fetchedAt ? Date.parse(fetchedAt) : Date.now();
          return {
            id,
            players,
            fetchedAt,
            ageSeconds: Math.max(0, Math.round((Date.now() - ts) / 1000)),
            _ts: ts,
          };
        }
        return { id, players: null, fetchedAt: null, ageSeconds: null, _ts: 0 };
      })
    );

    // 3) ETag
    const newestTs = rows.reduce((m, r) => Math.max(m, r._ts || 0), 0);
    const items = rows.map(({ _ts, ...rest }) => rest);
    const etag = `W/"${newestTs.toString(16)}"`;

    const inm = req.headers.get("if-none-match");
    if (inm && inm === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "s-maxage=30, stale-while-revalidate=120" },
      });
    }

    return resJSON({ ok: true, items, updatedAt: newestTs ? new Date(newestTs).toISOString() : null }, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}