// Verifies that the optional demo account fails closed without explicit configuration.

import assert from "node:assert/strict";
import test from "node:test";

import { isDemoLogin, resolveDemoAccountConfig } from "./demoAccount.js";

test("demo account is disabled when its password is not configured", () => {
  assert.equal(resolveDemoAccountConfig({}), null);
  assert.equal(resolveDemoAccountConfig({ DEMO_ACCOUNT_PASSWORD: "" }), null);
});

test("demo login requires the configured email and password", () => {
  const config = resolveDemoAccountConfig({ DEMO_ACCOUNT_PASSWORD: "strong-demo-password" });

  assert.deepEqual(config, {
    email: "demo@evotracker.org",
    password: "strong-demo-password",
  });
  assert.equal(
    isDemoLogin({ email: "demo@evotracker.org", password: "strong-demo-password" }, config),
    true
  );
  assert.equal(
    isDemoLogin({ email: "demo@evotracker.org", password: "wrong" }, config),
    false
  );
  assert.equal(isDemoLogin({ email: "demo@evotracker.org", password: "strong-demo-password" }, null), false);
});
