import assert from "node:assert/strict";
import test from "node:test";

import { requireCronAuth, resolveCronSecret } from "./cronAuth.js";

test("resolveCronSecret returns the first non-empty secret", () => {
  assert.equal(resolveCronSecret("", "  ", "secondary", "fallback"), "secondary");
  assert.equal(resolveCronSecret(null, undefined, " primary "), "primary");
  assert.equal(resolveCronSecret("", null, undefined), "");
});

test("requireCronAuth rejects missing secret", () => {
  const request = new Request("https://example.com/api/cron");
  const result = requireCronAuth(request, "", "CRON secret missing");

  assert.deepEqual(result, {
    ok: false,
    status: 500,
    error: "CRON secret missing",
  });
});

test("requireCronAuth rejects wrong authorization header", () => {
  const request = new Request("https://example.com/api/cron", {
    headers: { authorization: "Bearer wrong" },
  });
  const result = requireCronAuth(request, "correct-secret", "CRON secret missing");

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    error: "Unauthorized",
  });
});

test("requireCronAuth accepts matching authorization header", () => {
  const request = new Request("https://example.com/api/cron", {
    headers: { authorization: "Bearer correct-secret" },
  });
  const result = requireCronAuth(request, "correct-secret", "CRON secret missing");

  assert.deepEqual(result, { ok: true });
});
