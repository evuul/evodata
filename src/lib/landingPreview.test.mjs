// Checks that readable landing examples are fixed, labelled and isolated across calls.

import assert from "node:assert/strict";
import test from "node:test";
import { buildLandingPreviewModel } from "./landingPreview.js";

test("labels every illustrative metric without pretending it is live", () => {
  const model = buildLandingPreviewModel("sv");

  assert.equal(model.metrics.length, 3);
  model.metrics.forEach((metric) => {
    assert.match(metric.value, /[0-9]/);
    assert.equal(metric.status, "example");
  });
  assert.match(model.disclosure, /påhittade värden/);
  model.metrics[0].value = "changed";
  assert.equal(buildLandingPreviewModel("sv").metrics[0].value, "68 420");
});

test("returns localized product copy and falls back safely to Swedish", () => {
  assert.equal(buildLandingPreviewModel("en").metrics[0].label, "Live players");
  assert.equal(buildLandingPreviewModel("unknown").metrics[0].label, "Live-spelare");
  assert.match(buildLandingPreviewModel("en").disclosure, /illustrative values/i);
});
