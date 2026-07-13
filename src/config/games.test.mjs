import assert from "node:assert/strict";
import test from "node:test";

import { GAMES } from "./games.js";

const expectedEvolutionAdditions = [
  "monopoly-roulette",
  "extra-chili-epic-spins",
  "gold-bar-roulette",
  "gold-vault-roulette",
  "mega-roulette",
  "craps-live",
  "video-poker",
  "marble-race",
  "war-live",
  "fireball-roulette",
  "super-color-game",
  "cs-roulette",
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
