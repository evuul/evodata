// Verifies cookie security, CSRF handling, and transitional bearer authentication.

import assert from "node:assert/strict";
import test from "node:test";

import {
  COOKIE_SESSION_MARKER,
  SESSION_COOKIE_NAME,
  buildSessionUser,
  clearSessionCookie,
  getRequestAuth,
  isSessionExpired,
  isTrustedSessionRequest,
  setSessionCookie,
} from "./authSession.js";

test("allows restored sessions to use the current server-derived admin role", () => {
  const user = {
    email: "admin@example.com",
    isAdmin: false,
    notifications: { athEmail: 1, dailyAvgEmail: 0 },
    profile: {},
  };

  assert.equal(buildSessionUser(user).isAdmin, false);
  assert.equal(buildSessionUser(user).isFounder, false);
  const restored = buildSessionUser(user, { isAdmin: true });
  assert.equal(restored.isAdmin, true);
  assert.deepEqual(restored.notifications, {
    lobbyAthEmail: true,
    gameAthEmail: true,
    dailyAvgEmail: false,
  });
});

test("derives Founder access from the verified account directory", () => {
  const founder = buildSessionUser({
    email: "robinjonsson64@gmail.com",
    notifications: {},
    profile: {},
  });

  assert.equal(founder.isFounder, true);
  assert.equal(founder.founderSince, "2026-07-31");
});

const request = ({ method = "GET", origin, cookie, authorization, secFetchSite } = {}) => ({
  method,
  url: "https://evotracker.org/api/user/profile",
  headers: new Headers({
    ...(origin ? { origin } : null),
    ...(cookie ? { cookie } : null),
    ...(authorization ? { authorization } : null),
    ...(secFetchSite ? { "sec-fetch-site": secFetchSite } : null),
  }),
});

const cookieResponse = () => {
  const writes = [];
  return { writes, cookies: { set: (value) => writes.push(value) } };
};

test("accepts same-origin cookie requests and rejects cross-origin writes", () => {
  const cookie = `${SESSION_COOKIE_NAME}=session-123`;
  assert.deepEqual(getRequestAuth(request({ cookie })), { token: "session-123", source: "cookie" });
  assert.equal(
    getRequestAuth(request({ method: "POST", cookie, origin: "https://evil.example" })),
    null
  );
  assert.deepEqual(
    getRequestAuth(request({ method: "POST", cookie, origin: "https://evotracker.org" })),
    { token: "session-123", source: "cookie" }
  );
  assert.equal(isTrustedSessionRequest(request({ method: "POST", cookie })), false);
});

test("keeps real bearer tokens during migration but ignores the cookie marker", () => {
  assert.deepEqual(
    getRequestAuth(request({ method: "POST", authorization: "Bearer legacy-token" })),
    { token: "legacy-token", source: "bearer" }
  );
  assert.equal(
    getRequestAuth(request({ authorization: `Bearer ${COOKIE_SESSION_MARKER}` })),
    null
  );
});

test("rejects missing and expired session timestamps", () => {
  const now = Date.parse("2026-07-29T12:00:00.000Z");
  assert.equal(isSessionExpired({}, now), true);
  assert.equal(isSessionExpired({ expiresAt: "2026-07-29T11:59:59.000Z" }, now), true);
  assert.equal(isSessionExpired({ expiresAt: "2026-07-29T12:00:01.000Z" }, now), false);
});

test("sets and clears a hardened session cookie", () => {
  const response = cookieResponse();
  setSessionCookie(response, "secret", "2030-01-01T00:00:00.000Z");
  assert.deepEqual(response.writes[0], {
    name: SESSION_COOKIE_NAME,
    value: "secret",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: new Date("2030-01-01T00:00:00.000Z"),
  });

  clearSessionCookie(response);
  assert.equal(response.writes[1].value, "");
  assert.equal(response.writes[1].maxAge, 0);
  assert.equal(response.writes[1].expires.getTime(), 0);
});
