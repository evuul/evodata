// Retrieves the public Unibet live-casino list without a browser runtime.

import { createUnibetPilotSample } from "./unibetPilot.js";

export const DEFAULT_UNIBET_PILOT_API_URL =
  "https://www.unibet.mt/gamelistservice-rest-api/games/non-paginated/gamelist.json?listId=livecasinogameshowslobbynonpagev2&brand=unibet&jurisdiction=MT&locale=en_GB&deviceGroup=desktop&application=polopoly";
export const DEFAULT_UNIBET_PILOT_TIMEOUT_MS = 8_000;

const EXCLUDED_GAME_TYPES = new Set(["blackjack", "poker"]);

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const isEvolutionGame = (game) => /@evolution$/i.test(cleanText(game?.gameId));

export function extractUnibetPilotRows(payload) {
  const games = Array.isArray(payload?.gameList) ? payload.gameList : [];

  return games.flatMap((game) => {
    const liveCasino = game?.liveCasino;
    const gameType = cleanText(liveCasino?.gameType).toLowerCase();
    if (!isEvolutionGame(game) || !liveCasino || EXCLUDED_GAME_TYPES.has(gameType)) return [];

    return [{
      name: cleanText(liveCasino.gameName),
      provider: "Evolution",
      players: liveCasino.players,
      href: cleanText(game.gameId),
    }];
  });
}

async function fetchUnibetGameList(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Unibet returned HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectUnibetPilotSample({
  apiUrl = process.env.UNIBET_PILOT_API_URL || DEFAULT_UNIBET_PILOT_API_URL,
  timeoutMs = DEFAULT_UNIBET_PILOT_TIMEOUT_MS,
  fetchImpl = fetch,
} = {}) {
  const resolvedUrl = cleanText(apiUrl) || DEFAULT_UNIBET_PILOT_API_URL;
  const safeTimeoutMs = Math.max(1_000, Math.round(Number(timeoutMs) || DEFAULT_UNIBET_PILOT_TIMEOUT_MS));
  const payload = await fetchUnibetGameList(resolvedUrl, { fetchImpl, timeoutMs: safeTimeoutMs });
  const rows = extractUnibetPilotRows(payload);

  return createUnibetPilotSample({ rows, sourceUrls: [resolvedUrl] });
}
