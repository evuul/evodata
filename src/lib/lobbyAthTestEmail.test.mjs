// Verifies that the admin lobby-ATH test uses a clearly marked production-style email.

import assert from "node:assert/strict";
import test from "node:test";

import { buildLobbyAthTestEmail } from "./lobbyAthTestEmail.js";

test("builds a marked lobby ATH test email with deterministic example values", () => {
  const result = buildLobbyAthTestEmail({
    email: "admin@example.com",
    firstName: "Admin",
    now: new Date("2026-07-31T12:00:00.000Z"),
    coffeeUrl: "https://example.com/support",
  });

  assert.match(result.subject, /^\[TEST\] Lobby ATH/);
  assert.match(result.html, /Total live players/);
  assert.match(result.html, /Ice Fishing/);
  assert.match(result.html, /Hi Admin/);
  assert.deepEqual(result.testValues, {
    athValue: 105_432,
    previousAthValue: 104_144,
    at: "2026-07-31T12:00:00.000Z",
  });
});
