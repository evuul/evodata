// src/app/api/casinoscores/cron/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cronen gör EN upstream-hämtning (lobby) och sparar värden till KV.
 * Inga headless-anrop, inga tunga loopar -> snabb & stabil.
 */

import { saveSample, normalizePlayers } from "@/lib/csStore";

// Skydd
const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";

// Casinoscores lobby-endpoint (snabb)
const LOBBY_API = "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";

// Vilka serier vi vill spara (variant "a" läggs som ":a" i seriesKey)
const CRON_TARGETS = [
  { slug: "crazy-time", variant: "default" },
  // { slug: "crazy-time", variant: "a" }, // håll avstängd tills du vill ha CT A
  { slug: "monopoly-big-baller", variant: "default" },
  { slug: "funky-time", variant: "default" },
  { slug: "lightning-storm", variant: "default" },
  { slug: "crazy-balls", variant: "default" },
  { slug: "ice-fishing", variant: "default" },
  { slug: "xxxtreme-lightning-roulette", variant: "default" },
  { slug: "monopoly-live", variant: "default" },
  { slug: "red-door-roulette", variant: "default" },
  { slug: "auto-roulette", variant: "default" },
  { slug: "speed-baccarat-a", variant: "default" },
  { slug: "super-andar-bahar", variant: "default" },
  { slug: "lightning-dice", variant: "default" },
  { slug: "lightning-roulette", variant: "default" },
  { slug: "bac-bo", variant: "default" },
];

// Lobby-key mapping (så vi vet vilken nyckel i lobby-svaret som hör till vilket spel)
const LOBBY_KEY_MAP = new Map([
  ["crazy-time:default", "crazyTime"],
  ["crazy-time:a", "crazyTimeA"],
  ["monopoly-big-baller:default", "monopolyBigBallerLive"],
  ["funky-time:default", "funkyTime"],
  ["lightning-storm:default", "lightningStorm"],
  ["crazy-balls:default", "crazyBalls"],
  ["ice-fishing:default", "iceFishing"],
  ["xxxtreme-lightning-roulette:default", "xxxtremeLightningRoulette"],
  ["monopoly-live:default", "monopolyLive"],
  ["red-door-roulette:default", "redDoorRoulette"],
  ["auto-roulette:default", "autoRoulette"],
  ["speed-baccarat-a:default", "speedBaccaratA"],
  ["super-andar-bahar:default", "superAndarBahar"],
  ["lightning-dice:default", "lightningDice"],
  ["lightning-roulette:default", "lightningRoulette"],
  ["bac-bo:default", "bacBo"],
]);

function resJSON(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function okAuth(req) {
  // Tillåt antingen Authorization: Bearer <SECRET> eller ?token=<SECRET>
  const url = new URL(req.url);
  const qsToken = url.searchParams.get("token");
  if (qsToken && SECRET && qsToken === SECRET) return true;
  const hdr = req.headers.get("authorization") || "";
  return !!SECRET && hdr === `Bearer ${SECRET}`;
}

async function fetchLobby() {
  const r = await fetch(LOBBY_API, {
    headers: {
      accept: "application/json",
      "accept-language": "sv-SE,sv;q=0.9,en;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      referer: "https://casinoscores.com/",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Lobby HTTP ${r.status}`);
  return r.json();
}

export async function POST(req) {
  if (!okAuth(req)) return resJSON({ ok: false, error: "Unauthorized" }, 401);
  try {
    const lobby = await fetchLobby(); // 1 snabb upstream
    const createdAtISO = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : new Date().toISOString();

    const results = [];
    for (const { slug, variant = "default" } of CRON_TARGETS) {
      const mapKey = `${slug}:${variant || "default"}`;
      const lobbyKey = LOBBY_KEY_MAP.get(mapKey);
      const raw = lobbyKey ? lobby?.gameShowPlayerCounts?.[lobbyKey] : undefined;
      const n = normalizePlayers(raw); // säkrar nummer (t.ex. "1 234" -> 1234)

      if (Number.isFinite(n)) {
        const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
        try {
          await saveSample(seriesKey, createdAtISO, n);
          results.push({ slug, variant, ok: true, players: n, fetchedAt: createdAtISO });
        } catch (err) {
          results.push({ slug, variant, ok: false, error: `saveSample: ${String(err)}` });
        }
      } else {
        results.push({ slug, variant, ok: false, error: `No lobby value for ${mapKey}` });
      }
    }

    const fetched = results.filter(r => r.ok).length;
    return resJSON({
      ok: fetched === results.length,
      fetched,
      total: results.length,
      ts: new Date().toISOString(),
      results,
      via: "lobby",
    });
  } catch (err) {
    return resJSON({ ok: false, error: String(err) }, 502);
  }
}

export async function GET(req) {
  // praktiskt för manuell test: GET funkar också med token
  return POST(req);
}