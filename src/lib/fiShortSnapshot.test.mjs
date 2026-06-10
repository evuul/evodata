import assert from "node:assert/strict";
import test from "node:test";

const { stockholmYmd } = await import("./fiShortSnapshot.js");

test("stockholmYmd is exported as a callable helper", () => {
  const value = stockholmYmd(new Date("2026-06-10T12:00:00Z"));
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
});
