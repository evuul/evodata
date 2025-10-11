export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { normalizePlayers } from "@/lib/csStore";
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
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "1";
    const debug = searchParams.get("debug") === "1";

    const cache = g.__CS_ALL_CACHE__;
    const now = Date.now();
    if (!force && cache.data && now - cache.ts < TTL_MS && !debug) {
      const inm = req.headers.get("if-none-match");
      if (inm && cache.etag && inm === cache.etag) {
        return new Response(null, { status: 304, headers: { ETag: cache.etag } });
      }
      return resJSON(cache.data, 200, { ETag: cache.etag });
    }

    let lobby;
    try {
      lobby = await fetchLobbyCounts(force);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return resJSON({ ok: false, error: message }, 502);
    }

    const items = [];
    const lobbyCounts = lobby?.gameShowPlayerCounts || {};
    const createdAtIso = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : new Date().toISOString();

    for (const { slug, variant } of CRON_TARGETS) {
      const id = variant === "a" ? `${slug}:a` : slug;
      const lobbyKey = lobbyKeyFor(slug, variant);
      let players = null;
      let via = "lobby-api";
      let error = null;

      if (lobbyKey) {
        const raw = lobbyCounts[lobbyKey];
        const normalized = normalizePlayers(raw);
        if (normalized != null) {
          players = normalized;
        } else {
          via = "lobby-missing";
          error = `No lobby value for ${lobbyKey}`;
        }
      } else {
        via = "lobby-missing";
        error = `Missing lobby key for ${id}`;
      }

      items.push({
        id,
        slug,
        variant,
        players,
        fetchedAt: players != null ? createdAtIso : null,
        via,
        error,
      });
    }

    const payload = {
      ok: true,
      source: "lobby-api",
      fetchedAt: createdAtIso,
      lobbyId: lobby?.id || null,
      lobbyCreatedAt: lobby?.createdAt ? createdAtIso : null,
      itemCount: items.length,
      items,
    };

    if (debug) {
      payload.lobbyRaw = lobby;
    }

    const etag = makeEtag({
      createdAt: payload.lobbyCreatedAt,
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
