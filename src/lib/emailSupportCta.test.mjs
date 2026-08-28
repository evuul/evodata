// Regression tests for contextual support copy and source attribution in alert emails.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAthAlertEmail,
  buildDailyAvgPlayersEmail,
  buildHourlyBaselineLaunchEmail,
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

test("hourly baseline launch email thanks Premium and Founder supporters", () => {
  const email = buildHourlyBaselineLaunchEmail({
    email: "premium@example.com",
    firstName: "<Premium>",
    dashboardUrl: "https://evotracker.org",
  });

  assert.equal(email.subject, "New: Hourly Baseline is live in EvoTracker");
  assert.match(email.html, /Hourly Baseline/);
  assert.match(email.html, /Thank you again for supporting EvoTracker/);
  assert.match(email.html, /&lt;Premium&gt;/);
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
