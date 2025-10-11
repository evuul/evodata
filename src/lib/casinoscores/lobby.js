const LOBBY_API =
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const LOBBY_TTL_MS = 30 * 1000;

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

export const LOBBY_KEY_MAP = new Map([
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

export const CRON_TARGETS = ALLOWED_SLUGS.flatMap((slug) => {
  if (slug === "crazy-time") {
    return [
      { slug, variant: "default" },
      { slug, variant: "a" },
    ];
  }
  return [{ slug, variant: "default" }];
});

export function lobbyKeyFor(slug, variant = "default") {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return variant === "a" ? entry.a ?? null : entry.default ?? null;
}

const g = globalThis;
g.__CS_LOBBY__ ??= { ts: 0, data: null };

export async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(`${LOBBY_API}?ts=${Date.now()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
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
