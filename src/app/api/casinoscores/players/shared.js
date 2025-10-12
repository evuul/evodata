import { GAMES as GAME_CONFIG } from "@/config/games";

const GAME_ENTRIES = GAME_CONFIG.filter((game) => Boolean(game?.apiSlug));

export const ALLOWED_SLUGS = Array.from(new Set(GAME_ENTRIES.map((game) => game.apiSlug)));

export const SERIES_SLUGS = Array.from(new Set(GAME_CONFIG.map((game) => game.id)));

export const CRAZY_TIME_A_RESET_ISO = "2025-01-09T00:00:00Z";
const CRAZY_TIME_A_RESET_PARSED = Date.parse(CRAZY_TIME_A_RESET_ISO);
export const CRAZY_TIME_A_RESET_MS = Number.isFinite(CRAZY_TIME_A_RESET_PARSED)
  ? CRAZY_TIME_A_RESET_PARSED
  : Date.UTC(2025, 0, 9, 0, 0, 0);

export const CRON_TARGETS = (() => {
  const seen = new Set();
  const targets = [];
  for (const game of GAME_ENTRIES) {
    const slug = game.apiSlug;
    if (!slug) continue;
    const variant = game.apiVariant === "a" ? "a" : "default";
    const key = `${slug}:${variant}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ slug, variant });
  }
  return targets;
})();

export const LOBBY_KEY_MAP = new Map([
  ["crazy-time", { default: "crazyTime", a: "crazyTimeA" }],
  ["monopoly-live", "monopolyLive"],
  ["monopoly-big-baller", "monopolyBigBallerLive"],
  ["funky-time", "funkyTime"],
  ["lightning-roulette", "lightningRoulette"],
  ["lightning-baccarat", "lightningBaccarat"],
  ["xxxtreme-lightning-roulette", "xxxtremeLightningRoulette"],
  ["immersive-roulette", "immersiveRoulette"],
  ["cash-or-crash-live", "cashOrCrashLive"],
  ["fan-tan-live", "fanTanLive"],
  ["mega-ball", "megaBall"],
  ["free-bet-blackjack", "freeBetBlackjack"],
  ["dream-catcher", "dreamCatcher"],
  ["dead-or-alive-saloon", "deadOrAliveSaloon"],
  ["red-door-roulette", "redDoorRoulette"],
  ["lightning-dice", "lightningDice"],
  ["lightning-storm", "lightningStorm"],
  ["crazy-balls", "crazyBalls"],
  ["bac-bo", "bacBo"],
  ["super-andar-bahar", "superAndarBahar"],
  ["speed-baccarat-a", "speedBaccaratA"],
  ["lightning-bac-bo", "lightningBacBo"],
  ["auto-roulette", "autoRoulette"],
  ["super-sic-bo", "superSicBo"],
  ["fortune-roulette", "fortuneRoulette"],
  ["ice-fishing", "iceFishing"],
]);

export function lobbyKeyFor(slug, variant = "default") {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}
