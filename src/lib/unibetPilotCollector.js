// Retrieves the public Unibet live-casino list without a browser runtime.

import { createUnibetPilotSample } from "./unibetPilot.js";

const UNIBET_GAME_LIST_BASE_URL =
  "https://www.unibet.mt/gamelistservice-rest-api/games/non-paginated/gamelist.json?brand=unibet&jurisdiction=MT&locale=en_GB&deviceGroup=desktop&application=polopoly&listId=";

export const DEFAULT_UNIBET_PILOT_API_URLS = [
  "livecasinogameshowslobbynonpagev2",
  "livecasinoroulettelobbynonpagev2",
  "livecasinobaccaratlobbynonpagev2",
  "livecasinoblackjackdynamiclobbyv2onairmix",
  "livecasinopokerlobbynonpagev2",
].map((listId) => `${UNIBET_GAME_LIST_BASE_URL}${listId}`);
export const DEFAULT_UNIBET_PILOT_TIMEOUT_MS = 8_000;

const RECOVERY_TABLES = new Map([
  ["blackjack_TABLE-FreeBet000000001@evolution", {
    id: "free-bet-blackjack",
    name: "Free Bet Blackjack",
  }],
]);

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const parseApiUrls = (value) => {
  const urls = Array.isArray(value) ? value : String(value || "").split(",");
  return urls.map(cleanText).filter(Boolean);
};

const isEvolutionGame = (game) => /@evolution$/i.test(cleanText(game?.gameId));

export function extractUnibetPilotRows(payload) {
  const games = Array.isArray(payload?.gameList) ? payload.gameList : [];

  return games.flatMap((game) => {
    const liveCasino = game?.liveCasino;
    const gameType = cleanText(liveCasino?.gameType).toLowerCase();
    const gameName = cleanText(liveCasino?.gameName);
    const recoveryTable = RECOVERY_TABLES.get(cleanText(game?.gameId));
    const gameIdentity = `${gameType} ${gameName} ${cleanText(game?.gameId)}`;
    const isBlackjackTable = /\bblackjack\b|\bbj\b|freebet|always6|betstacker|funfun21|easybj/i.test(gameIdentity);
    const isPokerTable = /\bpoker\b|hold.?em|teen.?patti/i.test(gameIdentity);
    if (!isEvolutionGame(game) || !liveCasino) return [];
    const category = isBlackjackTable ? "blackjack" : isPokerTable ? "poker" : null;

    return [{
      ...(recoveryTable
        ? { id: recoveryTable.id }
        : category
          ? { id: cleanText(game.gameId) }
          : {}),
      name: recoveryTable?.name || gameName,
      provider: "Evolution",
      players: liveCasino.players,
      href: cleanText(game.gameId),
      ...(category ? { category } : {}),
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
    const payload = await response.json();
    if (!Array.isArray(payload?.gameList)) throw new Error("Unibet returned an invalid game list");
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectUnibetPilotSample({
  apiUrls = parseApiUrls(process.env.UNIBET_PILOT_API_URLS || process.env.UNIBET_PILOT_API_URL),
  apiUrl,
  timeoutMs = DEFAULT_UNIBET_PILOT_TIMEOUT_MS,
  fetchImpl = fetch,
} = {}) {
  const configuredUrls = parseApiUrls(apiUrl || apiUrls);
  const resolvedUrls = configuredUrls.length ? configuredUrls : DEFAULT_UNIBET_PILOT_API_URLS;
  const safeTimeoutMs = Math.max(1_000, Math.round(Number(timeoutMs) || DEFAULT_UNIBET_PILOT_TIMEOUT_MS));
  const results = await Promise.allSettled(
    resolvedUrls.map(async (url) => ({
      url,
      payload: await fetchUnibetGameList(url, { fetchImpl, timeoutMs: safeTimeoutMs }),
    }))
  );
  const successful = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  if (!successful.length) {
    const failure = results.find((result) => result.status === "rejected");
    throw failure?.reason || new Error("Unibet game lists could not be fetched");
  }
  const rows = successful.flatMap(({ payload }) => extractUnibetPilotRows(payload));
  const sample = createUnibetPilotSample({
    rows,
    sourceUrls: successful.map(({ url }) => url),
  });
  sample.failedSources = results
    .map((result, index) => ({ result, url: resolvedUrls[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, url }) => ({
      url,
      error: cleanText(result.reason instanceof Error ? result.reason.message : result.reason).slice(0, 160),
    }));

  return sample;
}
