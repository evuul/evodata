// Checks scheduler authentication, bounded requests, and reported collector failures.

import test from "node:test";
import assert from "node:assert/strict";
import worker, { runLobbySchedule } from "../../workers/hourlyLobbyScheduler.js";

const env = { CRON_BASE_URL: "https://example.com", CRON_SECRET: "test-only-secret" };

test("sends one authenticated request to the scheduled route", async () => {
  for (const [cron, path] of [["7,17,27,37,47,57 * * * *", "/api/casinoscores/cron"], ["35 3 * * *", "/api/casinoscores/lobby/materialize"]]) {
    let calls = 0;
    const result = await runLobbySchedule(cron, env, async (url, options) => {
      calls++;
      assert.equal(url.pathname, path);
      assert.equal(options.headers.Authorization, "Bearer test-only-secret");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal);
      return Response.json({ ok: true });
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, true);
  }
});

test("reports failed reads and writes even when the server returned HTTP 200", async () => {
  for (const payload of [{ ok: false }, { ok: true, hourly: { reason: "storage-unavailable" } }, { ok: true, hourlyBaseline: { ok: false } }]) {
    await assert.rejects(runLobbySchedule("35 3 * * *", env, async () => Response.json(payload)));
  }
  await assert.rejects(runLobbySchedule("35 3 * * *", env, async () => new Response(null, { status: 502 })));
});

test("does not expose a public trigger or send credentials to an insecure origin", async () => {
  assert.equal((await worker.fetch()).status, 404);
  for (const config of [{ ...env, CRON_BASE_URL: "http://example.com" }, { ...env, CRON_SECRET: "" }]) {
    await assert.rejects(runLobbySchedule("35 3 * * *", config, async () => assert.fail("must not fetch")));
  }
});
