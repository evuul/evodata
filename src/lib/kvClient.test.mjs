// Regression tests for shared Upstash KV configuration and REST requests.
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyKvEnvAliases,
  getKvRestHost,
  kvRestRequest,
  resolveKvRestConfig,
} from "./kvClient.js";

test("resolveKvRestConfig prefers write token aliases over read-only token", () => {
  const config = resolveKvRestConfig({
    KV_REST_API_URL: "https://kv.example",
    KV_REST_API_TOKEN: "write-token",
    KV_REST_API_READ_ONLY_TOKEN: "read-only-token",
    UPSTASH_REST_URL: "https://old.example",
    UPSTASH_REST_TOKEN: "old-token",
  });

  assert.deepEqual(config, {
    url: "https://kv.example",
    token: "write-token",
    readOnlyToken: "read-only-token",
  });
});

test("applyKvEnvAliases populates Vercel KV names without exposing secrets", () => {
  const env = {
    KV_URL: "https://kv-url.example",
    KV_REST_TOKEN: "fallback-token",
  };

  assert.equal(applyKvEnvAliases(env), true);
  assert.equal(env.KV_REST_API_URL, "https://kv-url.example");
  assert.equal(env.KV_REST_API_TOKEN, "fallback-token");
});

test("getKvRestHost returns only the configured host", () => {
  assert.equal(
    getKvRestHost({
      KV_REST_API_URL: "https://ethical-guinea-8616.upstash.io",
      KV_REST_API_TOKEN: "secret",
    }),
    "ethical-guinea-8616.upstash.io"
  );
});

test("kvRestRequest exposes status metadata without logging token", async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "secret-token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://kv.example/get/user%3Atest");
    assert.equal(init.headers.Authorization, "Bearer secret-token");
    return {
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    };
  };

  try {
    await assert.rejects(
      () => kvRestRequest("/get/user%3Atest", {}, { errorCodePrefix: "TEST_KV" }),
      (error) => {
        assert.equal(error.code, "TEST_KV_HTTP_ERROR");
        assert.equal(error.status, 401);
        assert.equal(error.path, "/get/user%3Atest");
        assert.equal(error.method, "GET");
        assert.equal(error.upstashHost, "kv.example");
        assert.equal(String(error.message).includes("secret-token"), false);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  }
});
