// Regression tests for auth-store cache behavior.
import assert from "node:assert/strict";
import test from "node:test";

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

test("authStore accepts KV environment aliases", async () => {
  delete process.env.UPSTASH_REST_URL;
  delete process.env.UPSTASH_REST_TOKEN;
  process.env.KV_REST_API_URL = "https://upstash.example";
  process.env.KV_REST_API_TOKEN = "token";

  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => {
      calls += 1;
      return { result: JSON.stringify({ passwordHash: "alias" }) };
    },
    text: async () => JSON.stringify({ result: JSON.stringify({ passwordHash: "alias" }) }),
  });

  try {
    const { getJson } = await import("./authStore.js?alias=" + Date.now());
    const user = await getJson("user:alias", { cache: false });

    assert.equal(user.passwordHash, "alias");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  }
});
