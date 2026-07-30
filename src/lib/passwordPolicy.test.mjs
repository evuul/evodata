// Verifies the shared password length boundaries.

import assert from "node:assert/strict";
import test from "node:test";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, validatePassword } from "./passwordPolicy.js";

test("accepts long passphrases without requiring arbitrary character classes", () => {
  assert.equal(validatePassword("correct horse battery staple").valid, true);
  assert.equal(validatePassword("x".repeat(MIN_PASSWORD_LENGTH)).valid, true);
});

test("rejects passwords outside the supported length range", () => {
  assert.deepEqual(validatePassword("x".repeat(MIN_PASSWORD_LENGTH - 1)), {
    valid: false,
    code: "too_short",
  });
  assert.deepEqual(validatePassword("x".repeat(MAX_PASSWORD_LENGTH + 1)), {
    valid: false,
    code: "too_long",
  });
});
