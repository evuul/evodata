#!/usr/bin/env node
// Reviews or publishes regular-lobby corrections from explicitly supplied local source exports.

import fs from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildRegularLobbyDaily } from "../src/lib/regularLobbyDaily.js";
import { applyRegularLobbyDailyToOverview } from "../src/lib/regularLobbyDailySnapshot.js";
import { saveRegularLobbyDailyHistory } from "../src/lib/regularLobbyDailyStore.js";
import { getOverviewSnapshot, setOverviewSnapshot, getMonthlyLobbyActivitySnapshot, setMonthlyLobbyActivitySnapshot } from "../src/lib/csStore.js";
import { mergeMonthlyLobbyActivitySnapshot } from "../src/lib/monthlyLobbyActivity.js";

const { values } = parseArgs({ options: {
  input: { type: "string" }, primary: { type: "string" }, output: { type: "string" },
  from: { type: "string" }, to: { type: "string" }, write: { type: "boolean", default: false },
} });
if (!values.input || !values.primary || !values.from || !values.to) throw new Error("Provide --input, --primary, --from and --to");
const decode = raw => typeof raw === "string" ? JSON.parse(raw) : raw;
const input = JSON.parse(await fs.readFile(values.input, "utf8"));
const source = JSON.parse(await fs.readFile(values.primary, "utf8"));
const samples = input.entries.filter(e => e.command[0] === "LRANGE" && e.command[1] === "pilot:unibet:history:v1").flatMap(e => e.data.map(decode));
const series = new Map(source.entries.filter(e => /^cs:.*:samples$/.test(e.command[1])).map(e => [e.command[1].slice(3, -8), e.data.map(decode)]));
const records = [];
let cursor = new Date(`${values.from}T12:00:00Z`);
const end = new Date(`${values.to}T12:00:00Z`);
if (!Number.isFinite(cursor.getTime()) || !Number.isFinite(end.getTime()) || end < cursor || end - cursor > 14 * 86400000) {
  throw new Error("Provide a valid range of at most 14 days");
}
while (cursor <= end) {
  records.push(buildRegularLobbyDaily(samples, series, cursor.toISOString().slice(0, 10)));
  cursor.setUTCDate(cursor.getUTCDate() + 1);
}
if (values.output) await fs.writeFile(values.output, JSON.stringify(records, null, 2) + "\n");
if (values.write) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN || process.env.LOCAL_REDIS_URL) {
    throw new Error("Choose the destination explicitly with --env-file; configure KV REST and omit LOCAL_REDIS_URL");
  }
  // Preserve a fresh rollback copy before changing any published key.
  const ranges = [30, 60, 90, 180, 365, 730];
  const snapshots = await Promise.all(ranges.map(days => getOverviewSnapshot(days)));
  const monthly = await getMonthlyLobbyActivitySnapshot();
  if (snapshots.some(snapshot => !snapshot?.data)) throw new Error("Missing overview snapshot; aborting publication");
  const backup = `${values.output ?? values.input}.before-write-${Date.now()}.json`;
  const { getRegularLobbyDailyHistory } = await import("../src/lib/regularLobbyDailyStore.js");
  await fs.writeFile(backup, JSON.stringify({ ranges, snapshots, monthly, previousCorrections: await getRegularLobbyDailyHistory({ force: true }) }, null, 2));
  await saveRegularLobbyDailyHistory(records);
  const generatedAt = new Date().toISOString();
  for (let index = 0; index < ranges.length; index++) {
    const days = ranges[index];
    const snapshot = snapshots[index];
    const data = { ...applyRegularLobbyDailyToOverview(snapshot.data, records, { days }), generatedAt };
    await setOverviewSnapshot(days, { ...snapshot, data, meta: {
      ...snapshot.meta, source: "regular-lobby-daily", cachedAt: generatedAt,
      staleAfter: new Date(Date.now() + 48 * 3600000).toISOString(),
    } });
    if (days === 730) await setMonthlyLobbyActivitySnapshot(mergeMonthlyLobbyActivitySnapshot(monthly, data.rawDailyTotals ?? data.dailyTotals, generatedAt));
  }
  console.log(`Rollback snapshot: ${backup}`);
}
console.log(JSON.stringify({ written: values.write, days: records.map(({ date, complete, avgPlayers, coverage, gameIds }) => ({ date, complete, avgPlayers, games: gameIds.length, ...coverage })) }, null, 2));
