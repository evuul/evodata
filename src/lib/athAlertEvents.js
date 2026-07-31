// Builds and filters lobby and per-game ATH events for alert delivery.

export const LOBBY_ATH_EVENT_ID = "lobby-total";

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function buildLobbyAthEvent({
  lobbyAth,
  latestItems,
  previousNotifiedValue,
  now = Date.now(),
  lookbackMs,
}) {
  const athValue = toFiniteNumber(lobbyAth?.value);
  const athAt = typeof lobbyAth?.at === "string"
    ? lobbyAth.at
    : typeof lobbyAth?.updatedAt === "string"
      ? lobbyAth.updatedAt
      : null;
  const athTimestamp = Date.parse(String(athAt || ""));
  const previousValue = toFiniteNumber(previousNotifiedValue);

  if (athValue == null || !Number.isFinite(athTimestamp)) return null;
  if (Number.isFinite(lookbackMs) && now - athTimestamp > lookbackMs) return null;
  if (previousValue != null && athValue <= previousValue) return null;

  const currentValue = (Array.isArray(latestItems) ? latestItems : []).reduce((sum, item) => {
    const players = toFiniteNumber(item?.players);
    return item?.stuck || players == null ? sum : sum + players;
  }, 0);

  return {
    id: LOBBY_ATH_EVENT_ID,
    kind: "lobby",
    name: "Total live players",
    athValue,
    athAt,
    previousAthValue: previousValue,
    previousAthAt: null,
    currentValue: currentValue > 0 ? currentValue : null,
  };
}

export function filterAthEventsForPreferences(events, preferences) {
  return (Array.isArray(events) ? events : []).filter((event) => {
    if (event?.kind === "lobby") return Boolean(preferences?.lobbyAthEmail);
    if (event?.kind === "game") return Boolean(preferences?.gameAthEmail);
    return false;
  });
}
