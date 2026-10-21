// Guards stored favourites against malformed, duplicate and removed panel values.

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFavoritePanels, toggleFavoritePanel } from "./dashboardFavorites.js";

const panels = ["live", "calendar", "financial"];

test("normalizes only available panel identifiers while preserving user order", () => {
  assert.deepEqual(normalizeFavoritePanels(["calendar", null, "removed", "calendar", {}, "live"], panels), ["calendar", "live"]);
  for (const malformed of [null, {}, "calendar", 7]) assert.deepEqual(normalizeFavoritePanels(malformed, panels), []);
});

test("toggles without mutating input and ignores unavailable views", () => {
  const saved = ["live"];
  assert.deepEqual(toggleFavoritePanel(saved, "calendar", panels), ["live", "calendar"]);
  assert.deepEqual(toggleFavoritePanel(saved, "live", panels), []);
  assert.deepEqual(toggleFavoritePanel(saved, "unknown", panels), saved);
  assert.deepEqual(saved, ["live"]);
});
