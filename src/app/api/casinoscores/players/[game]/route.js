// src/app/api/casinoscores/players/[game]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample, getLatestSample, normalizePlayers } from "@/lib/csStore";

// Endast bas-slugs här (utan :a). A styrs via ?variant=a.
export const ALLOWED_SLUGS = [
  "crazy-time",
  "monopoly-big-baller",
  "funky-time",
  "lightning-storm",
  "crazy-balls",
  "ice-fishing",
  "xxxtreme-lightning-roulette",
  "monopoly-live",
  "red-door-roulette",
  "auto-roulette",
  "speed-baccarat-a",
  "super-andar-bahar",
  "lightning-dice",
  "lightning-roulette",
  "bac-bo",
];

const ALLOWED = new Set(ALLOWED_SLUGS);

// const BASE = "https://casinoscores.com"; // ⬅️ ej använd när scraping är borttaget
const TTL_MS = 30 * 1000;

const LOBBY_API =
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const LOBBY_TTL_MS = 30 * 1000;

const g = globalThis;
g.__CS_CACHE__ ??= new Map(); // key: `${slug}:${variant}` -> { ts, data, etag }
g.__CS_LOBBY__ ??= { ts: 0, data: null };

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

function lobbyKeyFor(slug, variant) {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}

async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) {
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

  if (!res.ok) {
    throw new Error(`Lobby HTTP ${res.status}`);
  }

  const data = await res.json();
  cache.ts = now;
  cache.data = data;
  return data;
}

/* ---------------------------
   🔕 All scraping är avstängt
   ---------------------------

// ---------- Plain fetch (för default-varianten) ----------
function extractPlayersFromHTML(html) { ... }

async function plainFetch(url) { ... }

function parsePlayersFromText(text) { ... }

async function waitForPlayerCount(page, selector, timeout = 15000) { ... }

// ---------- Playwright (behövs för variant=a) ----------
async function tryPlaywright({ url, variant }) { ... }

// ---------- Puppeteer (för Vercel) ----------
async function tryPuppeteer({ url, variant }) { ... }

async function runHeadlessFetch(opts) { ... }

*/

export async function GET(req, ctx) {
  try {
    // Vänta in params i dynamiska API:er
    const paramsMaybe = ctx?.params;
    const params =
      paramsMaybe && typeof paramsMaybe.then === "function"
        ? await paramsMaybe
        : paramsMaybe || {};
    const slug = params.game;

    if (!slug || !ALLOWED.has(slug)) {
      return resJSON(
        { ok: false, error: "Unknown or disallowed game slug" },
        400
      );
    }

    const { searchParams } = new URL(req.url);
    const variant =
      (searchParams.get("variant") || "").toLowerCase() === "a"
        ? "a"
        : "default";
    const force = searchParams.get("force") === "1";
    const debug = searchParams.get("debug") === "1";

    // const url = `${BASE}/${slug}/`; // ⬅️ ej använd utan scraping
    const cacheKey = `${slug}:${variant}`;
    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;

    // Cache per variant (in-memory i samma lambda/instance)
    const entry = g.__CS_CACHE__.get(cacheKey);
    const now = Date.now();
    if (!force && entry && now - entry.ts < TTL_MS && !debug) {
      const inm = req.headers.get("if-none-match");
      if (inm && inm === entry.etag) {
        return new Response(null, { status: 304, headers: { ETag: entry.etag } });
      }
      return resJSON({ ok: true, source: "cache", ...entry.data }, 200, { ETag: entry.etag });
    }

    let players = null;
    let via = "unknown";
    let viaDetail = null;
    let lobbyError = null;
    let fetchedAtOverride = null;

    // ✅ 1) Lobby-API först (enda live-källan nu)
    const lobbyKey = lobbyKeyFor(slug, variant);
    if (lobbyKey) {
      try {
        const lobby = await fetchLobbyCounts(force);
        const raw = lobby?.gameShowPlayerCounts?.[lobbyKey];
        const normalized = normalizePlayers(raw);
        if (normalized != null) {
          players = normalized;
          via = "lobby-api";
          fetchedAtOverride = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null;
          if (lobby?.id || lobby?.createdAt) {
            viaDetail = [
              lobby?.id ? `id=${lobby.id}` : null,
              lobby?.createdAt ? `createdAt=${lobby.createdAt}` : null,
            ]
              .filter(Boolean)
              .join(" ");
          }
        } else {
          lobbyError = `No lobby value for ${lobbyKey}`;
        }
      } catch (error) {
        lobbyError = error instanceof Error ? error.message : String(error);
      }
    }

    // 🔁 2) Fallback till KV om lobby saknar värde
    if (!Number.isFinite(players)) {
      const fallback = await getLatestSample(seriesKey).catch(() => null);
      if (fallback) {
        const data = {
          slug,
          variant,
          players: fallback.value,
          fetchedAt: new Date(fallback.ts).toISOString(),
          stale: true,
        };
        const payload = {
          ok: true,
          ...data,
          via: via === "unknown" ? "fallback-cache" : `${via}-fallback`,
          viaDetail,
          lobbyError,
          source: "cache",
        };
        const etag = makeEtag({ slug, variant, players: data.players, fetchedAt: data.fetchedAt, stale: true });
        g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data: payload, etag });
        return resJSON(payload, 200, { ETag: etag, "Cache-Control": "no-store" });
      }

      // Ingen lobby och ingen KV
      return resJSON(
        {
          ok: false,
          error: "Hittade inte players",
          slug,
          variant,
          via,
          viaDetail,
          lobbyError,
        },
        503,
        { "Retry-After": "60" }
      );
    }

    // ✅ Lyckad lobby – spara sample + cacha i minnet
    const data = {
      slug,
      variant,
      players,
      fetchedAt: fetchedAtOverride || new Date().toISOString(),
      stale: false,
    };
    const payload = {
      ok: true,
      ...data,
      via,
      viaDetail,
      lobbyError,
    };

    try {
      await saveSample(seriesKey, data.fetchedAt, players);
    } catch {
      // swallow
    }

    const etag = makeEtag(data);
    g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data: payload, etag });

    if (debug) {
      return resJSON({
        ...payload,
        lobbyKey,
      });
    }

    return resJSON(payload, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}