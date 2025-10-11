// Snabb, fail-fast lobby-fetch med in-memory cache och export av mapping
export const CRON_TARGETS = [
  { slug: "crazy-time" },
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

const LOBBY_KEY_MAP = new Map([
  ["crazy-time",           { default: "crazyTime", a: "crazyTimeA" }],
  ["monopoly-big-baller",  "monopolyBigBallerLive"],
  ["funky-time",           "funkyTime"],
  ["lightning-storm",      "lightningStorm"],
  ["crazy-balls",          "crazyBalls"],
  ["ice-fishing",          "iceFishing"],
  ["xxxtreme-lightning-roulette","xxxtremeLightningRoulette"],
  ["monopoly-live",        "monopolyLive"],
  ["red-door-roulette",    "redDoorRoulette"],
  ["auto-roulette",        "autoRoulette"],
  ["speed-baccarat-a",     "speedBaccaratA"],
  ["super-andar-bahar",    "superAndarBahar"],
  ["lightning-dice",       "lightningDice"],
  ["lightning-roulette",   "lightningRoulette"],
  ["bac-bo",               "bacBo"],
]);

export function lobbyKeyFor(slug, variant = "default") {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}

const g = globalThis;
g.__EVO_LOBBY__ ??= { ts: 0, etag: null, json: null };

const UPSTREAM = "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const TTL_MS = 30_000;

// Liten helper för timeout med AbortController
function fetchWithTimeout(url, opts = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

/**
 * Hämtar lobby snabbt. Returnerar cache om färskt, annars försöker den upstream,
 * men avbryter efter timeoutMs. Kastar fel vid 403/abort så att caller kan falla tillbaka.
 */
export async function fetchLobbyCounts(force = false, timeoutMs = 2500) {
  const cache = g.__EVO_LOBBY__;
  const now = Date.now();

  if (!force && cache.json && now - cache.ts < TTL_MS) {
    return cache.json;
  }

  const headers = {
    accept: "application/json",
    "accept-language": "sv-SE,sv;q=0.9,en;q=0.8",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    referer: "https://casinoscores.com/",
    ...(cache.etag ? { "if-none-match": cache.etag } : {}),
  };

  let res;
  try {
    res = await fetchWithTimeout(UPSTREAM, { headers, cache: "no-store" }, timeoutMs);
  } catch (e) {
    // Abort/timeout → fail fast
    throw new Error("Lobby fetch aborted/timeout");
  }

  if (res.status === 304 && cache.json) {
    cache.ts = now;
    return cache.json;
  }

  if (!res.ok) {
    // 403, 5xx etc → bubbla upp så caller kan fallbacka
    throw new Error(`Lobby HTTP ${res.status}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Lobby JSON parse failed");
  }

  cache.ts = now;
  cache.etag = res.headers.get("etag") || `W/"${now.toString(16)}"`;
  cache.json = json;
  return json;
}