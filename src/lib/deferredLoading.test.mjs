// Verifies safe loading behavior for deferred dashboard sections.

import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowDeferredContent } from "./deferredLoading.js";

test("shows content immediately when IntersectionObserver is unavailable", () => {
  assert.equal(
    shouldShowDeferredContent({ observerSupported: false, isIntersecting: false }),
    true
  );
});

test("waits for intersection in supported browsers", () => {
  assert.equal(
    shouldShowDeferredContent({ observerSupported: true, isIntersecting: false }),
    false
  );
  assert.equal(
    shouldShowDeferredContent({ observerSupported: true, isIntersecting: true }),
    true
  );
});
