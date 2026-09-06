#!/usr/bin/env node
// Audits a local casino-scores export without contacting or modifying any database.

import fs from "node:fs/promises";
import { parseArgs } from "node:util";
import { auditHourlyHistory } from "../src/lib/hourlyLobbyHistoryAudit.js";
import { buildHourlyBaseline } from "../src/lib/hourlyLobbyAggregation.js";

const { values } = parseArgs({ options: { input: { type: "string" }, now: { type: "string" } } });
if (!values.input) throw new Error("Provide --input with a local series export or Upstash backup");
const now = values.now ? Date.parse(values.now) : Date.now();
if (!Number.isFinite(now)) throw new Error("Invalid --now timestamp");
const data = JSON.parse(await fs.readFile(values.input, "utf8"));
const series = data.series ?? Object.fromEntries(Object.entries(data.keys ?? {}).filter(([key, entry]) => /^cs:.*:samples$/.test(key) && entry.type === "list")
  .map(([key, entry]) => [key, entry.value.map((row) => typeof row === "string" ? JSON.parse(row) : row)]));
const audit = auditHourlyHistory(series, { now });
const baseline = buildHourlyBaseline(audit.observations, { now });
console.log(JSON.stringify({
  quality: "historical-reference", provenance: audit.provenance, rawSamples: audit.rawSamples,
  period: baseline.period, matchedObservations: audit.observations.length,
  retainedSlots: baseline.samples, readyHours: baseline.readyHours,
  hours: baseline.hourlyByHour.map(({ hour, distinctDays, recentDistinctDays, status }) => ({ hour, distinctDays, recentDistinctDays, status })),
}, null, 2));
