// src/app/api/casinoscores/players/all/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Hämtar "senaste sample" som fallback om lobby-API saknar ett värde
import { getLatestSample, normalizePlayers } from "@/lib/csStore";

/**
 * Den här endpointen:
 * 1) Läser Casinoscores lobby-API (30s TTL i minnescache)
 * 2) Mappar ut spel vi bryr oss om (inkl. varianter om/ när vi vill)
 * 3) Faller tillbaka till KV-sample om lobby saknar värde
 * 4) Returnerar ett "latest" paket likt /players/latest
 */

const TTL_MS = 30 * 1000;

// Lobby-API och in-memory cache
const LOBBY_API =
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";

const g = globalThis;
g.__CS_LOBBY__ ??= { ts: 0, data: null }; // { ts, data }

// Samma spel som vi visar (lägg till/ta bort här)
const TARGETS = [
  { slug: "crazy-time" },
  { slug: "crazy-time", variant: "a" }, // aktivera när du vill visa A
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
];

// Map från våra slugs -> lobby-nycklar
const LOBBY_KEY_MAP = new Map([
  ["crazy-time", { default: "crazyTime", a: "crazyTimeA" }],
  ["monopoly-big-baller", "monopolyBigBallerLive"],
  ["funky-time", "funkyTime"],
  ["lightning-storm", "lightningStorm"],
  ["crazy-balls", "crazyBalls"],
  ["ice-fishing", "iceFishing"],
  ["xxxtreme-lightning-roulette", "xxxtremeLightningRoulette"],
  ["monopoly-live", "monopolyLive"],
  ["red-door-roulette", "redDoorRoulette"],
  ["auto-roulette", "autoRoulette"],
  ["speed-baccarat-a", "speedBaccaratA"],
  ["super-andar-bahar", "superAndarBahar"],
  ["lightning-dice", "lightningDice"],
  ["lightning-roulette", "lightningRoulette"],
  ["bac-bo", "bacBo"],
]);

function lobbyKeyFor(slug, variant = "default") {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}

async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < TTL_MS) {
    return cache.data;
  }
  const res = await fetch(LOBBY_API, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      Referer: "https://casinoscores.com/",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Lobby HTTP ${res.status}`);
  const data = await res.json();
  cache.ts = now;
  cache.data = data;
  return data;
}

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
        const id = `${slug}${variant === "a" ? ":a" : ""}`;

        // Försök lobby först
        let players = null;
        let fetchedAt = null;

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