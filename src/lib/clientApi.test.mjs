// Verifies cookie-first client requests and transitional bearer support.

import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthRequestInit, COOKIE_SESSION_MARKER } from "./clientApi.js";

test("uses same-origin cookies without exposing a marker as a bearer token", () => {
  const init = buildAuthRequestInit(COOKIE_SESSION_MARKER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  assert.equal(init.credentials, "same-origin");
  assert.equal(init.headers.get("authorization"), null);
  assert.equal(init.headers.get("content-type"), "application/json");
});

test("keeps actual bearer tokens during the migration window", () => {
  const init = buildAuthRequestInit("legacy-token");
  assert.equal(init.headers.get("authorization"), "Bearer legacy-token");
});
