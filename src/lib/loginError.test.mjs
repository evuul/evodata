// Regression tests for login error classification.
import assert from "node:assert/strict";
import test from "node:test";
import { classifyLoginError, LOGIN_ERROR_KIND } from "./loginError.js";

test("classifyLoginError maps auth failures to stable kinds", () => {
  assert.equal(classifyLoginError({ status: 401 }), LOGIN_ERROR_KIND.invalidCredentials);
  assert.equal(classifyLoginError({ status: 400 }), LOGIN_ERROR_KIND.invalidInput);
  assert.equal(classifyLoginError({ status: 503 }), LOGIN_ERROR_KIND.serverUnavailable);
  assert.equal(classifyLoginError({ code: "AUTH_NETWORK_ERROR" }), LOGIN_ERROR_KIND.serverUnavailable);
  assert.equal(classifyLoginError({ code: "AUTH_INVALID_RESPONSE" }), LOGIN_ERROR_KIND.serverUnavailable);
  assert.equal(classifyLoginError({ code: "INVALID_CREDENTIALS" }), LOGIN_ERROR_KIND.invalidCredentials);
  assert.equal(classifyLoginError({ code: "INVALID_LOGIN_PAYLOAD" }), LOGIN_ERROR_KIND.invalidInput);
  assert.equal(classifyLoginError({}), LOGIN_ERROR_KIND.unknown);
});
