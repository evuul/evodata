// Verifies that the public landing model never exposes its illustrative raw metrics.

import assert from "node:assert/strict";
import test from "node:test";
import { buildLandingPreviewModel } from "./landingPreview.js";

test("masks every landing-page metric", () => {
  const model = buildLandingPreviewModel("sv");

  assert.equal(model.metrics.length, 3);
  model.metrics.forEach((metric) => {
    assert.doesNotMatch(metric.value, /[0-9]/);
    assert.doesNotMatch(JSON.stringify(metric), /68 420|512,4/);
  });
});

test("returns localized product copy and falls back safely to Swedish", () => {
  assert.equal(buildLandingPreviewModel("en").metrics[0].label, "Live players");
  assert.equal(buildLandingPreviewModel("unknown").metrics[0].label, "Live-spelare");
  assert.match(buildLandingPreviewModel("en").disclosure, /illustrative values/i);
});
