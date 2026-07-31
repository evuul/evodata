// Verifies lobby ATH detection and recipient-specific event filtering.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLobbyAthEvent,
  filterAthEventsForPreferences,
} from "./athAlertEvents.js";

test("builds a fresh lobby ATH event from non-stuck live games", () => {
  const event = buildLobbyAthEvent({
    lobbyAth: { value: 120_000, at: "2026-07-31T10:00:00.000Z" },
    latestItems: [
      { players: 70_000, stuck: false },
      { players: 40_000, stuck: false },
      { players: 10_000, stuck: true },
    ],
    previousNotifiedValue: 110_000,
    now: Date.parse("2026-07-31T11:00:00.000Z"),
    lookbackMs: 2 * 60 * 60 * 1000,
  });

  assert.equal(event.kind, "lobby");
  assert.equal(event.athValue, 120_000);
  assert.equal(event.previousAthValue, 110_000);
  assert.equal(event.currentValue, 110_000);
});

test("rejects stale or already-notified lobby records", () => {
  const input = {
    lobbyAth: { value: 120_000, at: "2026-07-01T10:00:00.000Z" },
    latestItems: [],
    now: Date.parse("2026-07-31T11:00:00.000Z"),
    lookbackMs: 24 * 60 * 60 * 1000,
  };

  assert.equal(buildLobbyAthEvent(input), null);
  assert.equal(
    buildLobbyAthEvent({
      ...input,
      lobbyAth: { value: 120_000, at: "2026-07-31T10:00:00.000Z" },
      previousNotifiedValue: 120_000,
    }),
    null
  );
});

test("filters lobby and game events using separate opt-ins", () => {
  const events = [
    { id: "lobby-total", kind: "lobby" },
    { id: "game-a", kind: "game" },
    { id: "unsupported", kind: "other" },
  ];

  assert.deepEqual(
    filterAthEventsForPreferences(events, {
      lobbyAthEmail: true,
      gameAthEmail: false,
    }).map((event) => event.id),
    ["lobby-total"]
  );
  assert.deepEqual(
    filterAthEventsForPreferences(events, {
      lobbyAthEmail: false,
      gameAthEmail: true,
    }).map((event) => event.id),
    ["game-a"]
  );
});
