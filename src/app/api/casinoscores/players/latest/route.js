// Node-runtime funkar bäst på Vercel eftersom upstream blockerar Edge-IP:er.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { CRON_TARGETS, lobbyKeyFor, fetchLobbyCounts } from "@/lib/casinoscores/lobby";
import { getLatestSample, normalizePlayers } from "@/lib/csStore";

const g = globalThis;
g.__CS_LATEST__ ??= { ts: 0, etag: null, payload: null };

const TTL_MS = 30 * 1000; // 30 sekunders cache räcker för hydrering

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "s-maxage=30, stale-while-revalidate=120",
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

export async function GET(req) {
  try {
    const now = Date.now();
    const cache = g.__CS_LATEST__;
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const inm = req.headers.get("if-none-match");

    if (!force && cache.payload && now - cache.ts < TTL_MS) {
      if (inm && cache.etag && inm === cache.etag) {
        return new Response(null, { status: 304, headers: { ETag: cache.etag } });
      }
      return resJSON(cache.payload, 200, cache.etag ? { ETag: cache.etag } : {});
    }

    let lobby = null;
    let lobbyError = null;
    try {
      lobby = await fetchLobbyCounts(force, 2500);
    } catch (error) {
      lobbyError = error instanceof Error ? error.message : String(error);
      lobby = null;
    }

    const items = [];
    let newestTs = 0;

    for (const { slug, variant = "default" } of CRON_TARGETS) {
      const id = `${slug}${variant === "a" ? ":a" : ""}`;
      let players = null;
      let fetchedAt = null;
      let source = "unknown";

      if (lobby) {
        const key = lobbyKeyFor(slug, variant);
        if (key) {
          const raw = lobby?.gameShowPlayerCounts?.[key];
          const norm = normalizePlayers(raw);
          if (norm != null) {
            players = norm;
            fetchedAt = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null;
            source = "lobby";
          }
        }
      }

      if (!Number.isFinite(players)) {
        const sample = await getLatestSample(id).catch(() => null);
        if (sample) {
          players = sample.value;
          fetchedAt = new Date(sample.ts).toISOString();
          source = "kv";
        }
      }

      if (Number.isFinite(players)) {
        const ts = fetchedAt ? Date.parse(fetchedAt) : Date.now();
        if (Number.isFinite(ts) && ts > newestTs) newestTs = ts;
      }

      items.push({
        id,
        players: Number.isFinite(players) ? players : null,
        fetchedAt,
        source: Number.isFinite(players) ? source : null,
      });
    }

    const payload = {
      ok: items.some((item) => Number.isFinite(item.players)),
      items,
      updatedAt: newestTs ? new Date(newestTs).toISOString() : null,
      lobbyError: lobbyError || undefined,
    };
    const etag = makeEtag({ items, updatedAt: payload.updatedAt });

    cache.ts = now;
    cache.payload = payload;
    cache.etag = etag;

    if (inm && etag && inm === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return resJSON(payload, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
