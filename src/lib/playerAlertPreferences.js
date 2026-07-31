// Normalizes player-alert preferences and preserves legacy ATH opt-ins.

export const PLAYER_ALERT_KEYS = Object.freeze([
  "lobbyAthEmail",
  "gameAthEmail",
  "dailyAvgEmail",
]);

const hasBoolean = (value) => typeof value === "boolean";

export function normalizePlayerAlertPreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const legacyAthEmail = Boolean(source.athEmail);

  return {
    lobbyAthEmail: hasBoolean(source.lobbyAthEmail)
      ? source.lobbyAthEmail
      : legacyAthEmail,
    gameAthEmail: hasBoolean(source.gameAthEmail)
      ? source.gameAthEmail
      : legacyAthEmail,
    dailyAvgEmail: Boolean(source.dailyAvgEmail),
  };
}

export function pickPlayerAlertPreferencePatch(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    PLAYER_ALERT_KEYS
      .filter((key) => hasBoolean(source[key]))
      .map((key) => [key, source[key]])
  );
}
