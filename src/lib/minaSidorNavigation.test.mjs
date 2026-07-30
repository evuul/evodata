// Verifies Mina sidor view authorization and URL generation.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMinaSidorViewHref,
  normalizeMinaSidorView,
} from "./minaSidorNavigation.js";

test("accepts user views and falls back safely for unknown values", () => {
  assert.equal(normalizeMinaSidorView("transaktioner"), "transaktioner");
  assert.equal(normalizeMinaSidorView("unknown"), "oversikt");
  assert.equal(normalizeMinaSidorView(null), "oversikt");
});

test("only exposes the admin view to administrators", () => {
  assert.equal(normalizeMinaSidorView("admin"), "oversikt");
  assert.equal(normalizeMinaSidorView("admin", { isAdmin: true }), "admin");
});

test("builds view links while preserving unrelated query parameters", () => {
  assert.equal(
    buildMinaSidorViewHref({ pathname: "/mina-sidor", search: "support=1", view: "transaktioner" }),
    "/mina-sidor?support=1&vy=transaktioner"
  );
  assert.equal(
    buildMinaSidorViewHref({ pathname: "/mina-sidor", search: "support=1&vy=agande", view: "oversikt" }),
    "/mina-sidor?support=1"
  );
});
