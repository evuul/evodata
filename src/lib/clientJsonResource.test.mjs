// Verifies cache, request sharing, retry and cancellation behavior in the client resource.

import assert from "node:assert/strict";
import test from "node:test";

import { createClientJsonResource } from "./clientJsonResource.js";

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

test("deduplicates concurrent requests and serves a fresh cached response", async () => {
  let calls = 0;
  let currentTime = 1_000;
  let resolveFetch;
  const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
  const resource = createClientJsonResource({
    url: "/data",
    cacheMs: 500,
    now: () => currentTime,
    fetchImpl: async () => {
      calls += 1;
      return fetchPromise;
    },
  });

  const first = resource.load();
  const second = resource.load();
  resolveFetch(jsonResponse({ value: 1 }));

  assert.deepEqual(await first, { value: 1 });
  assert.deepEqual(await second, { value: 1 });
  assert.equal(calls, 1);

  currentTime += 499;
  assert.deepEqual(await resource.load(), { value: 1 });
  assert.equal(calls, 1);
});

test("refresh bypasses cache while expired data triggers a normal reload", async () => {
  let calls = 0;
  let currentTime = 1_000;
  const resource = createClientJsonResource({
    url: "/data",
    cacheMs: 100,
    now: () => currentTime,
    fetchImpl: async () => jsonResponse({ call: ++calls }),
  });

  assert.deepEqual(await resource.load(), { call: 1 });
  assert.deepEqual(await resource.refresh(), { call: 2 });
  currentTime += 101;
  assert.deepEqual(await resource.load(), { call: 3 });
});

test("retries transient failures but not client errors", async () => {
  let transientCalls = 0;
  const transient = createClientJsonResource({
    url: "/data",
    retries: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    fetchImpl: async () => {
      transientCalls += 1;
      if (transientCalls === 1) throw new Error("network down");
      return jsonResponse({ ok: true });
    },
  });

  assert.deepEqual(await transient.load(), { ok: true });
  assert.equal(transientCalls, 2);

  let clientErrorCalls = 0;
  const clientError = createClientJsonResource({
    url: "/data",
    retries: 2,
    fetchImpl: async () => {
      clientErrorCalls += 1;
      return jsonResponse({}, 404);
    },
  });

  await assert.rejects(clientError.load(), /status 404/);
  assert.equal(clientErrorCalls, 1);
});

test("keeps stale data available when a forced refresh fails", async () => {
  let shouldFail = false;
  const resource = createClientJsonResource({
    url: "/data",
    retries: 0,
    fetchImpl: async () => {
      if (shouldFail) throw new Error("offline");
      return jsonResponse({ value: "cached" });
    },
  });

  await resource.load();
  shouldFail = true;
  await assert.rejects(resource.refresh(), /offline/);

  const snapshot = resource.getSnapshot();
  assert.deepEqual(snapshot.data, { value: "cached" });
  assert.equal(snapshot.status, "error");
  assert.match(snapshot.error.message, /offline/);
});

test("aborts a request when its timeout is reached", async () => {
  const resource = createClientJsonResource({
    url: "/slow",
    timeoutMs: 5,
    retries: 0,
    fetchImpl: async (_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });

  await assert.rejects(resource.load(), /timed out/);
  assert.equal(resource.getSnapshot().status, "error");
});
