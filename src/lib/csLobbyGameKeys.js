// Maps tracked game slugs to the player-count fields returned by the lobby source.

export const LOBBY_KEY_MAP = new Map([
  ["crazy-time", { default: "crazyTime", a: "crazyTimeA" }],
  ["monopoly-live", "monopolyLive"],
  ["monopoly-big-baller", "monopolyBigBallerLive"],
  ["funky-time", "funkyTime"],
  ["lightning-roulette", "lightningRoulette"],
  ["lightning-baccarat", "lightningBaccarat"],
  ["xxxtreme-lightning-roulette", "xxxtremeLightningRoulette"],
  ["immersive-roulette", "immersiveRoulette"],
  ["monopoly-roulette", "monopolyroulette"],
  ["cash-or-crash-live", "cashOrCrashLive"],
  ["fan-tan-live", "fanTanLive"],
  ["mega-ball", "megaBall"],
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
  ["extra-chili-epic-spins", "extraChiliEpicSpins"],
  ["gold-bar-roulette", "goldBarRoulette"],
  ["gold-vault-roulette", "goldVaultRoulette"],
  ["mega-roulette", "megaRoulette"],
  ["craps-live", "crapsLive"],
  ["video-poker", "videoPoker"],
  ["marble-race", "marbleRace"],
  ["war-live", "warLive"],
  ["fireball-roulette", "fireballRoulette"],
  ["super-color-game", "superColorGame"],
  ["cs-roulette", "csRoulette"],
]);

export function lobbyKeyFor(slug, variant = "default") {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}
