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

test("shows the error view only after an actual load failure", () => {
  assert.equal(
    resolveHomeDashboardView({
      initialized: true,
      isAuthenticated: false,
      dashboardState: { status: "error", variant: "public", value: null, error: new Error("failed") },
    }),
    "error"
  );
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
