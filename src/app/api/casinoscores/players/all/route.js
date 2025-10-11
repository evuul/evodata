// src/app/api/casinoscores/players/all/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestSample, normalizePlayers } from "@/lib/csStore";
import {
  CRON_TARGETS,
  lobbyKeyFor,
  fetchLobbyCounts,
} from "@/lib/casinoscores/lobby";

const TARGETS = CRON_TARGETS;

/**
 * Den här endpointen:
 * 1) Läser Casinoscores lobby-API (30s TTL i minnescache)
 * 2) Mappar ut spel vi bryr oss om (inkl. varianter om/ när vi vill)
 * 3) Faller tillbaka till KV-sample om lobby saknar värde
 * 4) Returnerar ett "latest" paket likt /players/latest
 */

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // CDN: kort cache + stale-while-revalidate
      "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      ...extra,
    },
  });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const origin = url.origin;

    // 1) Hämta lobby (med in-memory TTL)
    let lobby = null;
    try {
    lobby = await fetchLobbyCounts(force);
    } catch {
      lobby = null;
    }

    // 2) Bygg svar per target
    const rows = await Promise.all(
      TARGETS.map(async ({ slug, variant = "default" }) => {
        const variantValue = variant || "default";
        const id = `${slug}${variantValue === "a" ? ":a" : ""}`;

        // Försök lobby först
        let players = null;
        let fetchedAt = null;

        if (lobby) {
          const key = lobbyKeyFor(slug, variantValue);
          if (key) {
            const raw = lobby?.gameShowPlayerCounts?.[key];
            const norm = normalizePlayers(raw);
            if (norm != null) {
              players = norm;
              fetchedAt = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null;
            }
          }
        }

        // Force-request: hämta direkt från per-spel route om lobby saknar värde
        if (!Number.isFinite(players) && force) {
          try {
            const params = new URLSearchParams({ force: "1" });
            if (variantValue !== "default") params.set("variant", variantValue);
            const detailRes = await fetch(
              `${origin}/api/casinoscores/players/${slug}?${params.toString()}`,
              { cache: "no-store" }
            );
            if (detailRes.ok) {
              const detailJson = await detailRes.json().catch(() => null);
              const val = Number(detailJson?.players);
              if (detailJson?.ok && Number.isFinite(val)) {
                players = val;
                fetchedAt = detailJson.fetchedAt || null;
              }
            }
          } catch {
            // detaljfallet ignoreras om det felar – fallback hanterar resten
          }
        }

        // Fallback till KV om lobby saknar värde
        if (!Number.isFinite(players)) {
          const sample = await getLatestSample(id).catch(() => null);
          if (sample) {
            players = sample.value;
            fetchedAt = new Date(sample.ts).toISOString();
          }
        }

        // Svarsrad
        if (Number.isFinite(players)) {
          const ts = fetchedAt ? Date.parse(fetchedAt) : Date.now();
          return {
            id,
            players,
            fetchedAt,
            ageSeconds: Math.max(0, Math.round((Date.now() - ts) / 1000)),
            _ts: ts,
          };
        } else {
          return { id, players: null, fetchedAt: null, ageSeconds: null, _ts: 0 };
        }
      })
    );

    // 3) ETag på senaste ts
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

    return resJSON(
      {
        ok: true,
        items,
        updatedAt: newestTs ? new Date(newestTs).toISOString() : null,
      },
      200,
      { ETag: etag }
    );
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
