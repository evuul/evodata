// Verifies server-side Founder entitlement resolution and privacy boundaries.

import assert from "node:assert/strict";
import test from "node:test";
import {
  findFounderAccess,
  hasExtendedDataAccess,
  isFounderEmail,
  normalizeHistoryDays,
} from "./founderAccess.js";

const records = [
  {
    id: "founder-one",
    accountEmail: "founder@example.com",
    recognizedAt: "2026-07-31",
    qualified: true,
  },
  {
    id: "unqualified",
    accountEmail: "pending@example.com",
    recognizedAt: "2026-07-31",
    qualified: false,
  },
];

test("matches Founder accounts case-insensitively", () => {
  assert.deepEqual(findFounderAccess(" Founder@Example.com ", records), {
    id: "founder-one",
    recognizedAt: "2026-07-31",
  });
  assert.equal(isFounderEmail("founder@example.com", records), true);
});

test("rejects missing, unknown, and unqualified accounts", () => {
  assert.equal(findFounderAccess("", records), null);
  assert.equal(findFounderAccess("unknown@example.com", records), null);
  assert.equal(findFounderAccess("pending@example.com", records), null);
});

test("limits extended history to Founder accounts", () => {
  assert.equal(normalizeHistoryDays(730), 180);
  assert.equal(normalizeHistoryDays(365, { hasExtendedAccess: true }), 365);
  assert.equal(normalizeHistoryDays(999, { hasExtendedAccess: true }), 730);
  assert.equal(normalizeHistoryDays(2, { hasExtendedAccess: true }), 7);
});

test("allows both Founders and future Premium accounts", () => {
  assert.equal(hasExtendedDataAccess({ email: "founder@example.com" }, records), true);
  assert.equal(hasExtendedDataAccess({ email: "other@example.com", isSubscriber: true }, records), true);
  assert.equal(hasExtendedDataAccess({ email: "other@example.com" }, records), false);
});

test("limits Founder access to the first 30 qualified supporters", () => {
  const cappedRecords = Array.from({ length: 31 }, (_, index) => ({
    id: `founder-${index + 1}`,
    accountEmail: `founder-${index + 1}@example.com`,
    recognizedAt: "2026-07-31",
    qualified: true,
  }));

  assert.equal(isFounderEmail("founder-30@example.com", cappedRecords), true);
  assert.equal(isFounderEmail("founder-31@example.com", cappedRecords), false);
});
