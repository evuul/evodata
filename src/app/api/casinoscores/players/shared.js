import { GAMES as GAME_CONFIG } from "@/config/games";
import { LOBBY_KEY_MAP, lobbyKeyFor } from "@/lib/csLobbyGameKeys";

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

export { LOBBY_KEY_MAP, lobbyKeyFor };
