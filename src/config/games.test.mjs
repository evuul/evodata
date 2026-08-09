import assert from "node:assert/strict";
import test from "node:test";

import { FORECAST_GAME_IDS, GAMES, isUnibetTrackedGame, UNIBET_TRACKED_GAMES } from "./games.js";

const expectedEvolutionAdditions = [
  "monopoly-roulette",
  "extra-chili-epic-spins",
  "gold-vault-roulette",
  "mega-roulette",
  "craps-live",
  "marble-race",
  "war-live",
  "fireball-roulette",
  "super-color-game",
];

test("includes the newly tracked Evolution games", () => {
  const gameIds = new Set(GAMES.map((game) => game.id));

  for (const gameId of expectedEvolutionAdditions) {
    assert.equal(gameIds.has(gameId), true, `${gameId} should be tracked`);
  }
});

test("does not add known Pragmatic Play games to Evolution tracking", () => {
  const gameIds = new Set(GAMES.map((game) => game.id));

  for (const gameId of ["mega-wheel", "money-time", "treasure-island", "sweet-bonanza-candyland", "gates-of-olympus"]) {
    assert.equal(gameIds.has(gameId), false, `${gameId} should not be tracked as Evolution`);
  }
});

test("keeps Blackjack and Poker outside the Gameshows view", () => {
  const gameIds = new Set(GAMES.map((game) => game.id));

  assert.equal(gameIds.has("free-bet-blackjack"), false);
});

test("replaces frozen games with high-activity Unibet games in forecast coverage", () => {
  const gameIds = new Set(GAMES.map((game) => game.id));
  const replacementIds = [
    "no-commission-baccarat",
    "dragon-tiger",
    "turkce-lightning-rulet",
    "speed-auto-roulette",
  ];

  for (const retiredId of ["lightning-bac-bo", "gold-bar-roulette", "video-poker", "cs-roulette"]) {
    assert.equal(gameIds.has(retiredId), false, `${retiredId} should no longer be tracked`);
  }
  assert.deepEqual(UNIBET_TRACKED_GAMES.map((game) => game.id), replacementIds);
  assert.equal(isUnibetTrackedGame(UNIBET_TRACKED_GAMES[0]), true);
  assert.equal(isUnibetTrackedGame(GAMES.find((game) => game.id === "crazy-time")), false);
  for (const replacementId of replacementIds) {
    assert.equal(FORECAST_GAME_IDS.has(replacementId), true, `${replacementId} must be included in forecast coverage`);
  }
});
