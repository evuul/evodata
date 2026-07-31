// Verifies player-alert defaults, legacy migration and safe preference updates.

import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePlayerAlertPreferences,
  pickPlayerAlertPreferencePatch,
} from "./playerAlertPreferences.js";

test("migrates the legacy ATH preference to lobby and game alerts", () => {
  assert.deepEqual(normalizePlayerAlertPreferences({ athEmail: true }), {
    lobbyAthEmail: true,
    gameAthEmail: true,
    dailyAvgEmail: false,
  });
});

test("explicit player-alert preferences override the legacy value", () => {
  assert.deepEqual(
    normalizePlayerAlertPreferences({
      athEmail: true,
      lobbyAthEmail: false,
      gameAthEmail: true,
      dailyAvgEmail: true,
    }),
    {
      lobbyAthEmail: false,
      gameAthEmail: true,
      dailyAvgEmail: true,
    }
  );
});

test("accepts only supported boolean preference updates", () => {
  assert.deepEqual(
    pickPlayerAlertPreferencePatch({
      lobbyAthEmail: true,
      gameAthEmail: "yes",
      dailyAvgEmail: false,
      unknown: true,
    }),
    {
      lobbyAthEmail: true,
      dailyAvgEmail: false,
    }
  );
});
