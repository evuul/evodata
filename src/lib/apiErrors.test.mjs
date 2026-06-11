// Regression tests for safe API error response helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicErrorBody, getErrorDiagnostics } from "./apiErrors.js";

test("buildPublicErrorBody returns only the public message", () => {
  const body = buildPublicErrorBody({
    message: "Kunde inte hämta data just nu.",
    extra: { retryable: true },
  });

  assert.deepEqual(body, {
    ok: false,
    error: "Kunde inte hämta data just nu.",
    retryable: true,
  });
});

test("getErrorDiagnostics keeps server-side metadata separate from public body", () => {
  const error = new Error("Upstash /get/private:key failed");
  error.code = "KV_REST_HTTP_ERROR";
  error.status = 401;
  error.path = "/get/private%3Akey";
  error.method = "GET";
  error.upstashHost = "kv.example";

  assert.deepEqual(getErrorDiagnostics(error), {
    name: "Error",
    message: "Upstash /get/private:key failed",
    code: "KV_REST_HTTP_ERROR",
    status: 401,
    path: "/get/private%3Akey",
    method: "GET",
    upstashHost: "kv.example",
  });

  assert.deepEqual(buildPublicErrorBody(), {
    ok: false,
    error: "Servern svarar inte just nu. Försök igen om en stund.",
  });
});
