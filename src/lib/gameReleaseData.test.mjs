// Verifies that announced Evolution releases have usable public source metadata.

import assert from "node:assert/strict";
import test from "node:test";
import gameReleases from "../app/data/gameReleases.js";

test("includes Disco Balls as an announced 2026 Evolution game show", () => {
  const discoBalls = gameReleases.find((release) => release.id === "disco-balls");

  assert.ok(discoBalls);
  assert.equal(discoBalls.title, "Disco Balls");
  assert.equal(discoBalls.releaseWindow, "2026");
  assert.equal(discoBalls.type, "game-show");
  assert.match(discoBalls.sourceUrl, /games\.evolution\.com\/live-casino\/game-shows\/disco-balls/);
});
