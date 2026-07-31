// Builds a deterministic lobby-ATH example using the production email template.

import { buildAthAlertEmail } from "./emailTemplates.js";

const TEST_LOBBY_ATH = 105_432;
const TEST_PREVIOUS_LOBBY_ATH = 104_144;

export function buildLobbyAthTestEmail({
  email,
  firstName,
  now = new Date(),
  coffeeUrl,
}) {
  const timestamp = now instanceof Date && Number.isFinite(now.getTime())
    ? now.toISOString()
    : new Date().toISOString();
  const result = buildAthAlertEmail({
    email,
    firstName,
    events: [
      {
        id: "lobby-total-test",
        kind: "lobby",
        name: "Total live players",
        athValue: TEST_LOBBY_ATH,
        athAt: timestamp,
        previousAthValue: TEST_PREVIOUS_LOBBY_ATH,
        previousAthAt: null,
        currentValue: TEST_LOBBY_ATH,
      },
    ],
    topTrends: [
      { id: "ice-fishing", name: "Ice Fishing", pctChange: 18.4 },
      { id: "crazy-time", name: "Crazy Time", pctChange: 7.9 },
      { id: "monopoly-live", name: "Monopoly Live", pctChange: -3.2 },
    ],
    coffeeUrl,
  });

  return {
    subject: `[TEST] Lobby ATH – ${result.subject}`,
    html: result.html,
    testValues: {
      athValue: TEST_LOBBY_ATH,
      previousAthValue: TEST_PREVIOUS_LOBBY_ATH,
      at: timestamp,
    },
  };
}
