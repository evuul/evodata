// Regression tests for calendar validation, ordering and relative status.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNextCalendarChip,
  filterCalendarEvents,
  prepareFinancialCalendar,
} from "./financialCalendar.js";

const events = [
  { id: "later", date: "2026-10-23", category: "report" },
  { id: "past", date: "2026-04-24", category: "governance" },
  { id: "next", date: "2026-07-17", category: "report" },
  { id: "range", date: "2026-07-15", endDate: "2026-07-16", category: "industry" },
  { id: "invalid", date: "2026-02-31", category: "report" },
];

test("prepareFinancialCalendar validates, sorts and groups events", () => {
  const result = prepareFinancialCalendar(events, "2026-07-16");

  assert.deepEqual(result.all.map((event) => event.id), ["past", "range", "next", "later"]);
  assert.equal(result.all.find((event) => event.id === "range")?.status, "ongoing");
  assert.deepEqual(result.upcoming.map((event) => event.id), ["range", "next", "later"]);
  assert.deepEqual(result.past.map((event) => event.id), ["past"]);
  assert.equal(result.nextEvent?.id, "range");
  assert.equal(result.daysToNext, 0);
});

test("prepareFinancialCalendar calculates the next future event", () => {
  const result = prepareFinancialCalendar(
    events.filter((event) => event.id !== "range"),
    "2026-07-16"
  );

  assert.equal(result.nextEvent?.id, "next");
  assert.equal(result.daysToNext, 1);
});

test("filterCalendarEvents keeps the selected category", () => {
  const result = prepareFinancialCalendar(events, "2026-07-16");
  assert.deepEqual(filterCalendarEvents(result.all, "report").map((event) => event.id), ["next", "later"]);
  assert.equal(filterCalendarEvents(result.all, "all").length, 4);
});

test("buildNextCalendarChip creates concise desktop and mobile labels", () => {
  const chip = buildNextCalendarChip(
    [
      {
        id: "q2",
        date: "2026-07-17",
        titleSv: "Delårsrapport januari–juni 2026",
        titleEn: "Interim report January–June 2026",
        shortTitleSv: "Q2-rapport",
        shortTitleEn: "Q2 report",
        mobileTitleSv: "Q2",
        mobileTitleEn: "Q2",
      },
    ],
    "2026-07-16"
  );

  assert.equal(chip?.labelSv, "Q2-rapport imorgon");
  assert.equal(chip?.labelEn, "Q2 report tomorrow");
  assert.equal(chip?.mobileLabelSv, "Q2 imorgon");
});

test("buildNextCalendarChip uses a compact date for distant events", () => {
  const chip = buildNextCalendarChip(
    [
      {
        id: "q3",
        date: "2026-10-23",
        titleSv: "Delårsrapport januari–september 2026",
        titleEn: "Interim report January–September 2026",
        shortTitleSv: "Q3-rapport",
        shortTitleEn: "Q3 report",
      },
    ],
    "2026-07-16"
  );

  assert.equal(chip?.labelSv, "Q3-rapport 23 okt");
  assert.equal(chip?.labelEn, "Q3 report 23 Oct");
});
