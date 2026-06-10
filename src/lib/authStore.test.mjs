// Regression tests for auth-store cache behavior.
import assert from "node:assert/strict";
import test from "node:test";

test("resolveAuthStoreConfig prefers Vercel KV write env aliases", async () => {
  const { resolveAuthStoreConfig } = await import("./authStore.js?config=" + Date.now());

  assert.deepEqual(
    resolveAuthStoreConfig({
      KV_REST_API_URL: "https://kv.example",
      KV_REST_API_TOKEN: "kv-write-token",
      KV_REST_API_READ_ONLY_TOKEN: "read-only-token",
      UPSTASH_REST_URL: "https://old-upstash.example",
      UPSTASH_REST_TOKEN: "old-token",
    }),
    {
      url: "https://kv.example",
      token: "kv-write-token",
      readOnlyToken: "read-only-token",
    }
  );
});

test("getJson can bypass the read cache for fresh auth data", async () => {
  process.env.UPSTASH_REST_URL = "https://upstash.example";
  process.env.UPSTASH_REST_TOKEN = "token";

  const originalFetch = globalThis.fetch;
  let responses = [
    { result: JSON.stringify({ passwordHash: "old" }) },
    { result: JSON.stringify({ passwordHash: "new" }) },
  ];
  let calls = 0;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => responses[calls++],
    text: async () => JSON.stringify(responses[calls - 1]),
  });

  try {
    const { getJson } = await import("./authStore.js?test=" + Date.now());

    const first = await getJson("user:test");
    const second = await getJson("user:test");
    const fresh = await getJson("user:test", { cache: false });

    assert.equal(first.passwordHash, "old");
    assert.equal(second.passwordHash, "old");
    assert.equal(fresh.passwordHash, "new");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getJson exposes Upstash error metadata for diagnostics", async () => {
  process.env.UPSTASH_REST_URL = "https://upstash.example";
  process.env.UPSTASH_REST_TOKEN = "token";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => "unauthorized",
  });

  try {
    const { getJson } = await import("./authStore.js?errors=" + Date.now());

    await assert.rejects(
      () => getJson("user:test", { cache: false }),
      (error) => {
        assert.equal(error.code, "AUTHSTORE_UPSTASH_HTTP_ERROR");
        assert.equal(error.status, 401);
        assert.equal(error.path, "/get/user%3Atest");
        assert.equal(error.method, "GET");
        assert.equal(error.upstashHost, "upstash.example");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
