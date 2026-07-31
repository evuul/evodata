// Regression tests for safe support destinations and placement attribution.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSupportUrl,
  DEFAULT_SUPPORT_URL,
  resolveSupportBaseUrl,
} from "./supportLinks.js";

test("buildSupportUrl adds web attribution for a panel placement", () => {
  const url = new URL(buildSupportUrl("fair value"));

  assert.equal(`${url.origin}${url.pathname}`, DEFAULT_SUPPORT_URL);
  assert.equal(url.searchParams.get("utm_source"), "evotracker");
  assert.equal(url.searchParams.get("utm_medium"), "web");
  assert.equal(url.searchParams.get("utm_content"), "fair_value");
});

test("buildSupportUrl identifies email placements", () => {
  const url = new URL(buildSupportUrl("email_ath"));

  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_content"), "email_ath");
});

test("resolveSupportBaseUrl rejects unsafe and unrelated destinations", () => {
  assert.equal(resolveSupportBaseUrl("http://buymeacoffee.com/evuul"), DEFAULT_SUPPORT_URL);
  assert.equal(resolveSupportBaseUrl("https://example.com/evuul"), DEFAULT_SUPPORT_URL);
  assert.equal(resolveSupportBaseUrl("not a url"), DEFAULT_SUPPORT_URL);
});
