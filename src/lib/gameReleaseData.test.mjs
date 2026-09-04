// Verifies that announced Evolution releases have usable public source metadata.

import assert from "node:assert/strict";
import test from "node:test";
import gameReleases from "../app/data/gameReleases.js";
import { prepareGameReleaseSchedule } from "./gameReleaseSchedule.js";

test("includes Disco Balls with its confirmed September 9 launch date", () => {
  const discoBalls = gameReleases.find((release) => release.id === "disco-balls");

  assert.ok(discoBalls);
  assert.equal(discoBalls.title, "Disco Balls");
  assert.equal(discoBalls.releaseDate, "2026-09-09");
  assert.equal(discoBalls.releaseWindow, undefined);
  assert.equal(discoBalls.type, "game-show");
  assert.match(discoBalls.sourceUrl, /games\.evolution\.com\/live-casino\/game-shows\/disco-balls/);
});

test("shows Disco Balls as the next confirmed release through launch day", () => {
  for (const today of ["2026-09-04", "2026-09-09"]) {
    const schedule = prepareGameReleaseSchedule(gameReleases, today);

    assert.equal(schedule.nextRelease?.id, "disco-balls");
    assert.equal(schedule.nextRelease?.timing, "confirmed");
    assert.ok(!schedule.released.some((release) => release.id === "disco-balls"));
  }

  const afterLaunch = prepareGameReleaseSchedule(gameReleases, "2026-09-10");
  assert.ok(afterLaunch.released.some((release) => release.id === "disco-balls"));
  assert.ok(!afterLaunch.upcoming.some((release) => release.id === "disco-balls"));
});
