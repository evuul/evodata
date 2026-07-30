// Verifies reset links cannot be redirected by client input.

import assert from "node:assert/strict";
import test from "node:test";

import { buildPasswordResetUrl, resolveTrustedAppOrigin } from "./passwordResetUrl.js";

test("uses the configured application origin and fixed reset path", () => {
  assert.equal(
    buildPasswordResetUrl({
      requestUrl: "https://preview.example/api/auth/forgot-password",
      email: "USER@example.com",
      token: "secret.token",
      env: { APP_ORIGIN: "https://evotracker.org/untrusted/path" },
    }),
    "https://evotracker.org/reset-password?email=user%40example.com&token=secret.token"
  );
});

test("rejects insecure non-local origins and falls back to the request origin", () => {
  assert.equal(
    resolveTrustedAppOrigin("https://evotracker.org/api/auth/forgot-password", {
      APP_ORIGIN: "http://evil.example",
    }),
    "https://evotracker.org"
  );
  assert.equal(resolveTrustedAppOrigin("http://localhost:3000/path", {}), "http://localhost:3000");
});
