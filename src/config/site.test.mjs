// Checks canonical origin handling for metadata, robots and sitemap consumers.

import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "./site.js";

test("uses the public origin by default and strips paths and queries", () => {
  assert.equal(resolveSiteUrl(), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("https://example.com/path?secret=value"), "https://example.com");
  assert.equal(resolveSiteUrl("http://localhost:3000"), "http://localhost:3000");
});

test("rejects invalid URLs, credentials and non-web protocols", () => {
  for (const value of ["not-a-url", "javascript:alert(1)", "https://user:password@example.com", "file:///tmp/site"]) {
    assert.equal(resolveSiteUrl(value), DEFAULT_SITE_URL);
  }
});
