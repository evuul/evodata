// Verifies home dashboard transitions during authentication and data loading.

import test from "node:test";
import assert from "node:assert/strict";
import { resolveHomeDashboardView } from "./homeDashboardState.js";

test("keeps showing loading during the render between auth initialization and the loading effect", () => {
  assert.equal(
    resolveHomeDashboardView({
      initialized: true,
      isAuthenticated: true,
      dashboardState: { status: "idle", variant: null, value: null, error: null },
    }),
    "loading"
  );
});

test("does not show stale content when the authenticated variant changes", () => {
  assert.equal(
    resolveHomeDashboardView({
      initialized: true,
      isAuthenticated: true,
      dashboardState: { status: "success", variant: "public", value: {}, error: null },
    }),
    "loading"
  );
});

test("shows the error view only after an authenticated load failure", () => {
  assert.equal(
    resolveHomeDashboardView({
      initialized: true,
      isAuthenticated: true,
      dashboardState: { status: "error", variant: "authenticated", value: null, error: new Error("failed") },
    }),
    "error"
  );
});

test("renders public content before session restoration and immediately after logout", () => {
  assert.equal(resolveHomeDashboardView({ initialized: false }), "public");
  assert.equal(resolveHomeDashboardView({
    initialized: true,
    isAuthenticated: false,
    dashboardState: { status: "success", variant: "authenticated", value: { private: true } },
  }), "public");
});

test("selects the completed dashboard variant", () => {
  assert.equal(
    resolveHomeDashboardView({
      initialized: true,
      isAuthenticated: true,
      dashboardState: { status: "success", variant: "authenticated", value: {}, error: null },
    }),
    "authenticated"
  );
});
