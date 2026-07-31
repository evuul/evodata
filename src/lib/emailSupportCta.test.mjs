// Regression tests for contextual support copy and source attribution in alert emails.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAthAlertEmail,
  buildDailyAvgPlayersEmail,
} from "./emailTemplates.js";

test("ATH alert attributes its contextual support link", () => {
  const email = buildAthAlertEmail({
    email: "user@example.com",
    firstName: "User",
    events: [],
    topTrends: [],
  });

  assert.match(email.html, /saved you time/);
  assert.match(email.html, /utm_content=email_ath/);
  assert.match(email.html, /Help keep live tracking running/);
});

test("daily average email attributes its contextual support link", () => {
  const email = buildDailyAvgPlayersEmail({
    email: "user@example.com",
    firstName: "User",
    dateYmd: "2026-07-30",
    totalAvgPlayers: 50_000,
    changeAbs: 1_000,
    changePct: 2,
    coverageLabel: "Tracked games",
  });

  assert.match(email.html, /generated automatically/);
  assert.match(email.html, /utm_content=email_daily_avg/);
  assert.match(email.html, /Help keep daily tracking running/);
});
