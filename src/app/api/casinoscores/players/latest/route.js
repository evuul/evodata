// Edge = snabb & billig. Ingen headless behövs för detta JSON-anrop.
export const runtime = "edge";

// In-memory cache i Edge/Node instance
const g = globalThis;
g.__EVO_LOBBY__ ??= { ts: 0, etag: null, json: null };

const UPSTREAM = "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const TTL_MS = 30 * 1000; // 30s är lagom för detta flöde

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

export async function GET(req) {
  try {
    const now = Date.now();
    const inm = req.headers.get("if-none-match");
    const cache = g.__EVO_LOBBY__;

    // 1) Returnera ur minne om färskt (billigast)
    if (cache.json && now - cache.ts < TTL_MS) {
      if (inm && cache.etag && inm === cache.etag) {
        return new Response(null, { status: 304, headers: { ETag: cache.etag } });
      }
      return resJSON(cache.json, 200, cache.etag ? { ETag: cache.etag } : {});
    }

    // 2) Hämta upstream (skicka If-None-Match om vi har ETag)
    const upstream = await fetch(`${UPSTREAM}?ts=${Date.now()}`, {
      headers: {
        accept: "application/json",
        "user-agent": "curl/8.5.0",
        ...(cache.etag ? { "if-none-match": cache.etag } : {}),
      },
      cache: "no-store",
    });

    // 304 från upstream → behåll vår cache, svara 304 om klienten bad om samma ETag
    if (upstream.status === 304 && cache.json) {
      cache.ts = now;
      if (inm && cache.etag && inm === cache.etag) {
        return new Response(null, { status: 304, headers: { ETag: cache.etag } });
      }
      return resJSON(cache.json, 200, cache.etag ? { ETag: cache.etag } : {});
    }

    if (!upstream.ok) {
      // Fallback till cache om upstream felar
      if (cache.json) {
        return resJSON({ ok: true, stale: true, ...cache.json }, 200, cache.etag ? { ETag: cache.etag } : {});
      }
      return resJSON({ ok: false, error: `Upstream HTTP ${upstream.status}` }, upstream.status);
    }

    const json = await upstream.json();
    const etag = upstream.headers.get("etag") || `W/"${now.toString(16)}"`;

    // Uppdatera cache
    cache.ts = now;
    cache.json = json;
    cache.etag = etag;

    if (inm && etag && inm === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }
    return resJSON(json, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: String(err) }, 500);
  }
}
