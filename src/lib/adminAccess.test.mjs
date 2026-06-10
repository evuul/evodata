import assert from "node:assert/strict";
import test from "node:test";

import { getConfiguredAdminEmail, isConfiguredAdminEmail } from "./adminAccess.js";

test("getConfiguredAdminEmail returns null when ADMIN_EMAIL is missing", () => {
  assert.equal(getConfiguredAdminEmail({}), null);
  assert.equal(getConfiguredAdminEmail({ ADMIN_EMAIL: "   " }), null);
});

test("isConfiguredAdminEmail fails closed without ADMIN_EMAIL", () => {
  assert.equal(isConfiguredAdminEmail("alexander.ek@live.se", {}), false);
});

test("isConfiguredAdminEmail matches explicit ADMIN_EMAIL case-insensitively", () => {
  const env = { ADMIN_EMAIL: " Admin@Example.com " };

  assert.equal(isConfiguredAdminEmail("admin@example.com", env), true);
  assert.equal(isConfiguredAdminEmail("ADMIN@EXAMPLE.COM", env), true);
  assert.equal(isConfiguredAdminEmail("other@example.com", env), false);
});
