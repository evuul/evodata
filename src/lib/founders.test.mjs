// Verifies privacy and validation rules for the public Founders directory.

import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishedFounders } from "./founders.js";
import { FOUNDERS } from "../app/data/founders.js";

test("publishes only qualified supporters who approved public recognition", () => {
  const result = buildPublishedFounders([
    {
      id: "early-supporter",
      displayName: "  Early   Supporter  ",
      recognizedAt: "2026-07-31",
      profileUrl: "https://example.com/supporter",
      qualified: true,
      consentToPublish: true,
    },
    {
      id: "private-supporter",
      displayName: "Private Supporter",
      recognizedAt: "2026-07-30",
      qualified: true,
      consentToPublish: false,
    },
    {
      id: "not-qualified",
      displayName: "Not Qualified",
      recognizedAt: "2026-07-29",
      qualified: false,
      consentToPublish: true,
    },
  ]);

  assert.deepEqual(result, [
    {
      id: "early-supporter",
      displayName: "Early Supporter",
      recognizedAt: "2026-07-31",
      profileUrl: "https://example.com/supporter",
    },
  ]);
});

test("rejects malformed records, unsafe links, and duplicate ids", () => {
  const result = buildPublishedFounders([
    {
      id: "founder-one",
      displayName: "Founder One",
      recognizedAt: "2026-02-28",
      profileUrl: "javascript:alert(1)",
      qualified: true,
      consentToPublish: true,
    },
    {
      id: "founder-one",
      displayName: "Duplicate",
      recognizedAt: "2026-02-27",
      qualified: true,
      consentToPublish: true,
    },
    {
      id: "bad-date",
      displayName: "Bad Date",
      recognizedAt: "2026-02-30",
      qualified: true,
      consentToPublish: true,
    },
  ]);

  assert.deepEqual(result, [
    {
      id: "founder-one",
      displayName: "Founder One",
      recognizedAt: "2026-02-28",
      profileUrl: null,
    },
  ]);
});

test("sorts founders by recognition date and then display name", () => {
  const records = [
    { id: "c", displayName: "Charlie", recognizedAt: "2026-08-02", qualified: true, consentToPublish: true },
    { id: "b", displayName: "Beta", recognizedAt: "2026-08-01", qualified: true, consentToPublish: true },
    { id: "a", displayName: "Alpha", recognizedAt: "2026-08-01", qualified: true, consentToPublish: true },
  ];

  assert.deepEqual(
    buildPublishedFounders(records).map((founder) => founder.id),
    ["a", "b", "c"]
  );
});

test("configured founders expose display names without publishing email addresses", () => {
  const published = buildPublishedFounders(FOUNDERS);

  assert.equal(published.length, 1);
  assert.equal(published[0].displayName, "Robin Jonsson");
  assert.equal(published[0].displayName.includes("@"), false);
  assert.equal("accountEmail" in published[0], false);
});
