// Verifies the password-reset availability flag remains opt-out.

import assert from "node:assert/strict";
import test from "node:test";
import { isPasswordResetEnabled } from "./passwordResetAvailability.js";

test("enables password resets unless explicitly disabled", () => {
  assert.equal(isPasswordResetEnabled(undefined), true);
  assert.equal(isPasswordResetEnabled("true"), true);
  assert.equal(isPasswordResetEnabled("false"), false);
  assert.equal(isPasswordResetEnabled(" FALSE "), false);
});
