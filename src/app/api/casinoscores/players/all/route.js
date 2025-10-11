export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestSample, normalizePlayers } from "@/lib/csStore";
import { CRON_TARGETS, lobbyKeyFor, fetchLobbyCounts } from "../[game]/route";

const TTL_MS = 30 * 1000;

const g = globalThis;
g.__CS_ALL_CACHE__ ??= { ts: 0, data: null, etag: null };

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

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const debug = url.searchParams.get("debug") === "1";

    const cache = g.__CS_ALL_CACHE__;
    const now = Date.now();
    if (!force && cache.data && now - cache.ts < TTL_MS && !debug) {
      const inm = req.headers.get("if-none-match");
      if (inm && cache.etag && inm === cache.etag) {
        return new Response(null, { status: 304, headers: { ETag: cache.etag } });
      }
      return resJSON(cache.data, 200, { ETag: cache.etag });
    }

    let lobby = null;
    let lobbyError = null;
    try {
      lobby = await fetchLobbyCounts(force);
    } catch (err) {
      lobbyError = err instanceof Error ? err.message : String(err);
      lobby = null;
    }

    const items = await Promise.all(
      CRON_TARGETS.map(async ({ slug, variant }) => {
        const id = variant === "a" ? `${slug}:a` : slug;
        const lobbyKey = lobbyKeyFor(slug, variant);

        let players = null;
        let fetchedAt = null;
        let via = "lobby-api";
        let error = null;

        if (lobby && lobbyKey) {
          const raw = lobby?.gameShowPlayerCounts?.[lobbyKey];
          const normalized = normalizePlayers(raw);
          if (normalized != null) {
            players = normalized;
            fetchedAt = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : new Date().toISOString();
          } else {
            via = "lobby-missing";
            error = `No lobby value for ${lobbyKey}`;
          }
        } else if (!lobbyKey) {
          via = "lobby-missing";
          error = `Missing lobby key for ${id}`;
        } else if (lobbyError) {
          via = "lobby-error";
          error = lobbyError;
        }

        if (!Number.isFinite(players)) {
          const sample = await getLatestSample(id).catch(() => null);
          if (sample) {
            players = sample.value;
            fetchedAt = new Date(sample.ts).toISOString();
            via = via === "lobby-api" ? "fallback-cache" : `${via}-fallback`;
            error = error || null;
          }
        }

        const ts = fetchedAt ? Date.parse(fetchedAt) : null;
        return {
          id,
          slug,
          variant,
          players: Number.isFinite(players) ? players : null,
          fetchedAt: fetchedAt || null,
          ageSeconds: ts ? Math.max(0, Math.round((Date.now() - ts) / 1000)) : null,
          via,
          error,
        };
      })
    );

    const newestTs = items.reduce((max, item) => {
      const ts = item.fetchedAt ? Date.parse(item.fetchedAt) : 0;
      return Math.max(max, Number.isFinite(ts) ? ts : 0);
    }, 0);

    const payload = {
      ok: true,
      source: "lobby-api",
      fetchedAt: newestTs ? new Date(newestTs).toISOString() : null,
      lobbyCreatedAt: lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null,
      lobbyId: lobby?.id ?? null,
      itemCount: items.length,
      items,
      lobbyError,
    };

    if (debug) {
      payload.lobbyRaw = lobby;
    }

    const etag = makeEtag({
      fetchedAt: payload.fetchedAt,
      items: items.map(({ id, players, fetchedAt }) => ({ id, players, fetchedAt })),
    });

    g.__CS_ALL_CACHE__ = { ts: Date.now(), data: payload, etag };

    const inm = req.headers.get("if-none-match");
    if (!force && inm && etag && inm === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return resJSON(payload, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
