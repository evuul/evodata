// Verifies that browser protections remain strict without breaking local development.

import test from "node:test";
import assert from "node:assert/strict";
import { buildContentSecurityPolicy, getSecurityHeaders } from "./securityHeaders.js";

const toHeaderMap = (headers) => new Map(headers.map(({ key, value }) => [key, value]));

test("production CSP restricts sensitive resource types", () => {
  const policy = buildContentSecurityPolicy();

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /upgrade-insecure-requests/);
  assert.doesNotMatch(policy, /'unsafe-eval'/);
});

test("CSP permits only the external Vercel resources used by the client", () => {
  const policy = buildContentSecurityPolicy();

  assert.match(policy, /script-src 'self' 'unsafe-inline' https:\/\/va\.vercel-scripts\.com/);
  assert.match(policy, /connect-src 'self' https:\/\/va\.vercel-scripts\.com https:\/\/\*\.vercel-insights\.com/);
  assert.doesNotMatch(policy, /default-src[^;]*\*/);
});

test("development policy supports Next tooling without enabling HTTPS upgrades", () => {
  const policy = buildContentSecurityPolicy({ isDevelopment: true });

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("production headers include transport, framing, MIME, and browser feature protections", () => {
  const headers = toHeaderMap(getSecurityHeaders());

  assert.equal(headers.get("Strict-Transport-Security"), "max-age=63072000; includeSubDomains; preload");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Cross-Origin-Opener-Policy"), "same-origin");
  assert.match(headers.get("Permissions-Policy"), /camera=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /browsing-topics=\(\)/);
});

test("development headers omit HSTS so localhost is not pinned to HTTPS", () => {
  const headers = toHeaderMap(getSecurityHeaders({ isDevelopment: true }));

  assert.equal(headers.has("Strict-Transport-Security"), false);
});
