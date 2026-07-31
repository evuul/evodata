// Regression tests for release validation, status and chronological ordering.

import assert from "node:assert/strict";
import test from "node:test";
import gameReleases from "../app/data/gameReleases.js";
import { prepareGameReleaseSchedule } from "./gameReleaseSchedule.js";

const releases = [
  { id: "announced", title: "Announced", releaseWindow: "2026", sourceUrl: "https://example.com/announced" },
  { id: "recent", title: "Recent", releaseDate: "2026-07-15", sourceUrl: "https://example.com/recent" },
  { id: "next", title: "Next", releaseDate: "2026-08-20", sourceUrl: "https://example.com/next" },
  { id: "later", title: "Later", releaseDate: "2026-10-10", sourceUrl: "https://example.com/later" },
  { id: "invalid-date", title: "Invalid", releaseDate: "2026-02-31", sourceUrl: "https://example.com/invalid" },
  { id: "missing-source", title: "Missing source", releaseWindow: "2026" },
];

test("prepareGameReleaseSchedule groups and sorts confirmed and announced releases", () => {
  const schedule = prepareGameReleaseSchedule(releases, "2026-07-31");

  assert.deepEqual(schedule.upcoming.map((release) => release.id), ["next", "later", "announced"]);
  assert.deepEqual(schedule.released.map((release) => release.id), ["recent"]);
  assert.equal(schedule.nextRelease?.id, "next");
  assert.equal(schedule.upcoming.at(-1)?.timing, "announced");
});

test("prepareGameReleaseSchedule treats a release date as upcoming on launch day", () => {
  const schedule = prepareGameReleaseSchedule(releases, "2026-07-15");

  assert.equal(schedule.upcoming[0]?.id, "recent");
  assert.equal(schedule.released.length, 0);
});

test("prepareGameReleaseSchedule safely handles invalid input", () => {
  assert.deepEqual(prepareGameReleaseSchedule(null, "invalid"), {
    upcoming: [],
    released: [],
    nextRelease: null,
  });
});

test("the public schedule keeps Game Night and MONOPOLY Filthy Rich as separate releases", () => {
  const schedule = prepareGameReleaseSchedule(gameReleases, "2026-07-31");
  const upcomingIds = schedule.upcoming.map((release) => release.id);

  assert.ok(upcomingIds.includes("game-night"));
  assert.ok(upcomingIds.includes("monopoly-filthy-rich"));
  assert.notEqual(
    schedule.upcoming.find((release) => release.id === "game-night")?.title,
    schedule.upcoming.find((release) => release.id === "monopoly-filthy-rich")?.title
  );
});
