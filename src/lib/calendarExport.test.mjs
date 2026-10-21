// Exercises calendar date semantics, Stockholm offsets and content-line safety.

import test from "node:test";
import assert from "node:assert/strict";
import { buildEventCalendar } from "./calendarExport.js";
import financialCalendarEvents from "../app/data/financialCalendar.js";

const now = new Date("2026-10-21T12:00:00Z");
const base = { id: "example-event", date: "2027-01-18", titleSv: "Rapport", titleEn: "Report", descriptionSv: "Beskrivning", sourceUrl: "https://www.evolution.com/" };
const exportEvent = (changes = {}, options = {}) => buildEventCalendar({ ...base, ...changes }, { now, ...options });

test("all-day exports have exclusive end dates across month and year boundaries", () => {
  assert.match(exportEvent(), /DTSTART;VALUE=DATE:20270118\r\nDTEND;VALUE=DATE:20270119/);
  assert.match(exportEvent({ endDate: "2027-01-20" }), /DTEND;VALUE=DATE:20270121/);
  assert.match(exportEvent({ date: "2026-12-31" }), /DTEND;VALUE=DATE:20270101/);
  assert.match(exportEvent({}, { locale: "en" }), /SUMMARY:Report\r\n/);
});

test("Stockholm times convert to UTC in summer and winter without inventing a duration", () => {
  const summer = exportEvent({ date: "2027-04-21", time: "07:30" });
  assert.match(summer, /DTSTART:20270421T053000Z/);
  assert.doesNotMatch(summer, /DTEND/);
  assert.match(exportEvent({ time: "07:30" }), /DTSTART:20270118T063000Z/);
});

test("invalid dates, unsafe identifiers and impossible local times are rejected", () => {
  for (const change of [
    { id: "bad\r\nBEGIN:VEVENT" }, { date: "2027-02-30" }, { endDate: "2027-01-17" },
    { time: "25:00" }, { date: "2027-03-28", time: "02:30" }, { titleSv: "" },
  ]) assert.equal(exportEvent(change), null);
  assert.equal(buildEventCalendar(null), null);
});

test("text cannot inject calendar properties and UTF-8 lines stay within 75 octets", () => {
  const calendar = exportEvent({ titleSv: "Å😀".repeat(80) + "\r\nATTENDEE:evil,semi;slash\\", sourceUrl: "javascript:alert(1)" });
  assert.doesNotMatch(calendar, /\r\nATTENDEE:/);
  assert.doesNotMatch(calendar, /\r\nURL:/);
  assert.match(calendar.replaceAll("\r\n ", ""), /\\nATTENDEE:evil\\,semi\\;slash\\\\/);
  for (const line of calendar.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
});

test("every sourced calendar entry can be downloaded in both languages", () => {
  for (const event of financialCalendarEvents) {
    for (const locale of ["sv", "en"]) assert.ok(buildEventCalendar(event, { now, locale }), `${event.id} ${locale}`);
  }
  const publishedDates = ["2027-02-04", "2027-04-21", "2027-04-23", "2027-07-16", "2027-10-21", "2028-02-03"];
  for (const date of publishedDates) assert.ok(financialCalendarEvents.some((event) => event.date === date));
});
