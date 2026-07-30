// Verifies auth throttling without exposing raw account or network identifiers.

import assert from "node:assert/strict";
import test from "node:test";

import { checkAuthRateLimit, rateLimitResponseHeaders } from "./authRateLimit.js";

const request = {
  headers: new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" }),
};

test("blocks when either the IP or account window exceeds its limit", async () => {
  const seenKeys = [];
  const result = await checkAuthRateLimit({
    request,
    scope: "login",
    account: "User@Example.com",
    rules: {
      ip: { limit: 2, windowSeconds: 60 },
      account: { limit: 1, windowSeconds: 120 },
    },
    increment: async (key, windowSeconds) => {
      seenKeys.push(key);
      return { count: key.includes(":account:") ? 2 : 1, ttl: windowSeconds };
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.retryAfter, 120);
  assert.deepEqual(rateLimitResponseHeaders(result), { "Retry-After": "120" });
  assert.equal(seenKeys.some((key) => key.includes("User@Example.com")), false);
  assert.equal(seenKeys.some((key) => key.includes("203.0.113.8")), false);
});

test("allows requests within both windows", async () => {
  const result = await checkAuthRateLimit({
    request,
    scope: "login",
    account: "user@example.com",
    rules: {
      ip: { limit: 2, windowSeconds: 60 },
      account: { limit: 2, windowSeconds: 60 },
    },
    increment: async () => ({ count: 2, ttl: 30 }),
  });
  assert.deepEqual(result, { allowed: true, retryAfter: 0 });
});
