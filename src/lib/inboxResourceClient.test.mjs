// Verifies request sharing, identity isolation and message-cache updates.

import assert from "node:assert/strict";
import test from "node:test";

import { createInboxResourceClient } from "./inboxResourceClient.js";

test("deduplicates concurrent inbox reads and reuses a fresh response", async () => {
  let calls = 0;
  let resolveRequest;
  const pending = new Promise((resolve) => { resolveRequest = resolve; });
  const client = createInboxResourceClient({
    fetchJson: async () => {
      calls += 1;
      return pending;
    },
  });

  const first = client.loadMessages({ identity: "USER@example.com", token: "token" });
  const second = client.loadMessages({ identity: "user@example.com", token: "token" });
  resolveRequest({ messages: [{ id: "1" }], unreadCount: 1 });

  assert.deepEqual(await first, { messages: [{ id: "1" }], unreadCount: 1 });
  assert.deepEqual(await second, { messages: [{ id: "1" }], unreadCount: 1 });
  assert.equal(calls, 1);

  await client.loadMessages({ identity: "user@example.com", token: "token" });
  assert.equal(calls, 1);
});

test("keeps admin, user and account resources isolated", async () => {
  const calls = [];
  const client = createInboxResourceClient({
    fetchJson: async (_token, url) => {
      calls.push(url);
      return { url };
    },
  });

  await client.loadSupport({ identity: "one@example.com", token: "token" });
  await client.loadSupport({ identity: "one@example.com", token: "token", isAdmin: true });
  await client.loadSupport({ identity: "two@example.com", token: "token" });

  assert.deepEqual(calls, [
    "/api/support/tickets",
    "/api/admin/support/tickets",
    "/api/support/tickets",
  ]);
});

test("stores mutation responses and invalidates support data explicitly", async () => {
  let supportReads = 0;
  const requests = [];
  const client = createInboxResourceClient({
    fetchJson: async (_token, url, init = {}) => {
      requests.push({ url, init });
      if (url === "/api/user/messages" && init.method === "PUT") {
        return { messages: [{ id: "1", readAt: "now" }], unreadCount: 0 };
      }
      supportReads += 1;
      return { tickets: [{ id: String(supportReads) }] };
    },
  });

  const updated = await client.markMessagesRead({
    identity: "user@example.com",
    token: "token",
    ids: ["1"],
  });
  assert.equal(updated.unreadCount, 0);
  assert.deepEqual(JSON.parse(requests[0].init.body), { action: "markRead", ids: ["1"] });

  await client.loadMessages({ identity: "user@example.com", token: "token" });
  assert.equal(requests.length, 1);

  await client.loadSupport({ identity: "user@example.com", token: "token" });
  client.invalidateSupport({ identity: "user@example.com" });
  await client.loadSupport({ identity: "user@example.com", token: "token" });
  assert.equal(supportReads, 2);
});
