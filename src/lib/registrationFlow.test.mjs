// Regression tests for account registration persistence flow.
import assert from "node:assert/strict";
import test from "node:test";
import { createAccountWithSession, runRegistrationAfterCommit } from "./registrationFlow.js";

test("createAccountWithSession deletes the user record when session creation fails", async () => {
  const calls = [];
  const error = new Error("session failed");

  await assert.rejects(
    () =>
      createAccountWithSession({
        email: "new@example.com",
        user: { email: "new@example.com" },
        setJson: async (key, value) => calls.push(["set", key, value.email]),
        createSession: async () => {
          calls.push(["session"]);
          throw error;
        },
        deleteKey: async (key) => calls.push(["delete", key]),
        getUserKey: (email) => `user:${email}`,
      }),
    error
  );

  assert.deepEqual(calls, [
    ["set", "user:new@example.com", "new@example.com"],
    ["session"],
    ["delete", "user:new@example.com"],
  ]);
});

test("createAccountWithSession keeps the user record after session creation succeeds", async () => {
  const calls = [];
  const session = await createAccountWithSession({
    email: "new@example.com",
    user: { email: "new@example.com" },
    setJson: async (key) => calls.push(["set", key]),
    createSession: async () => ({ token: "session-token" }),
    deleteKey: async (key) => calls.push(["delete", key]),
    getUserKey: (email) => `user:${email}`,
  });

  assert.deepEqual(session, { token: "session-token" });
  assert.deepEqual(calls, [["set", "user:new@example.com"]]);
});

test("runRegistrationAfterCommit reports optional task failures without throwing", async () => {
  const result = await runRegistrationAfterCommit({
    email: "new@example.com",
    indexUser: async () => {
      throw new Error("index failed");
    },
    sendWelcome: async () => {},
  });

  assert.equal(result.indexed, false);
  assert.equal(result.welcomeSent, true);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].index, 0);
});
