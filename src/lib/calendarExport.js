// Builds RFC 5545 event downloads with Stockholm times and exclusive all-day ends.

import { prepareFinancialCalendar } from "./financialCalendar.js";

const compactDate = (date) => date.replaceAll("-", "");
const compactTimestamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const escapeText = (value) => String(value || "").replaceAll("\\", "\\\\").replace(/\r\n|\r|\n/g, "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");
const encoder = new TextEncoder();

function foldLine(line) {
  const lines = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  return [...lines, current].join("\r\n");
}

function stockholmTimestamp(date, time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const expected = `${date}T${time}:00`;
  const guess = Date.parse(`${expected}Z`);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const localTimestamp = (value) => {
    const parts = Object.fromEntries(formatter.formatToParts(value).map(({ type, value: text }) => [type, text]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  };
  const offset = Date.parse(`${localTimestamp(guess)}Z`) - guess;
  const result = new Date(guess - offset);
  return localTimestamp(result) === expected ? compactTimestamp(result) : null;
}

export function buildEventCalendar(event, { locale = "sv", now = new Date() } = {}) {
  if (!/^[a-z0-9-]+$/.test(event?.id || "")) return null;
  const normalized = prepareFinancialCalendar([event], "2000-01-01").all[0];
  if (!normalized || !Number.isFinite(now.getTime())) return null;
  if (event.endDate && event.endDate !== normalized.endDate) return null;
  const title = locale === "en" ? event.titleEn : event.titleSv;
  const description = locale === "en" ? event.descriptionEn : event.descriptionSv;
  if (!title) return null;

  const dates = [];
  if (event.time) {
    const start = stockholmTimestamp(event.date, event.time);
    if (!start || normalized.endDate !== event.date) return null;
    dates.push(`DTSTART:${start}`);
  } else {
    const end = new Date(`${normalized.endDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    dates.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`, `DTEND;VALUE=DATE:${compactDate(end.toISOString().slice(0, 10))}`);
  }

  let source = null;
  try {
    const url = new URL(event.sourceUrl);
    if (url.protocol === "https:" && !url.username && !url.password) source = url.href;
  } catch {
    // Missing source links do not prevent downloading an otherwise valid event.
  }

  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EvoTracker//Investor Calendar//SV", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${event.id}@evotracker.org`, `DTSTAMP:${compactTimestamp(now)}`,
    ...dates, `SUMMARY:${escapeText(title)}`, `DESCRIPTION:${escapeText(description)}`,
    ...(source ? [`URL:${source}`] : []), "TRANSP:TRANSPARENT", "END:VEVENT", "END:VCALENDAR",
  ].map(foldLine).join("\r\n") + "\r\n";
}
