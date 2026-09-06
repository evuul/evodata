// Verifies equal-day reference statistics, coverage gates, and daily materialization failures.

import assert from "node:assert/strict";
import test from "node:test";
import { buildHourlyBaseline } from "./hourlyLobbyAggregation.js";
import { loadHourlyLobbyBaseline, shouldReuseHourlyLobbyBaseline } from "./hourlyLobbyBaseline.js";
import { cohortSignature, HOURLY_SLOT_MS } from "./hourlyLobbyPolicy.js";

const now = Date.parse("2026-09-06T10:00:00Z");
const signature = cohortSignature();
function hour(day, value = 100, minutes = [0, 10, 20, 30], hour = "09") {
  return minutes.map((minute) => {
    const ts = Date.parse(`${day}T${hour}:${String(minute).padStart(2, "0")}:00+02:00`);
    return { ts, newestTs: ts, value, signature };
  });
}
const days = ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"];
const readyPoints = () => days.flatMap((day) => hour(day));

test("requires seven covered days and weights days equally instead of substituting a median", () => {
  const points = days.flatMap((day, index) => hour(day, index === 6 ? 1500 : 100, index === 6 ? [0, 10, 20, 30, 40, 50] : undefined));
  const baseline = buildHourlyBaseline(points, { now });
  assert.equal(baseline.hourlyByHour[9].baselineAvg, 300);
  assert.equal(baseline.hourlyByHour[9].distinctDays, 7);
  assert.equal(baseline.hourlyByHour[9].recentDistinctDays, 7);
  assert.equal(baseline.readyHours, 1);
  assert.equal(baseline.hourlyByHour[10].baselineAvg, null);
});

test("sparse hours and repeated copies of a sample cannot satisfy the coverage gate", () => {
  const points = days.flatMap((day) => hour(day, 100, [0, 10]));
  const result = buildHourlyBaseline([...points, ...points, ...points], { now });
  assert.equal(result.samples, 14);
  assert.equal(result.hourlyByHour[9].distinctDays, 0);
  assert.equal(result.readyHours, 0);
});

test("deduplicates ten-minute slots deterministically and ignores mismatched universes", () => {
  const points = readyPoints();
  const replacement = { ...points[0], ts: points[0].ts + 1000, newestTs: points[0].ts + 1000, value: 200 };
  const mismatched = points.map((p) => ({ ...p, signature: "new-game-universe", value: 100000 }));
  const forward = buildHourlyBaseline([...points, replacement, ...mismatched], { now });
  const reverse = buildHourlyBaseline([...mismatched, replacement, ...points].reverse(), { now });
  assert.deepEqual(forward, reverse);
  assert.equal(forward.samples, 28);
  assert.ok(Math.abs(forward.hourlyByHour[9].baselineAvg - (6 * 100 + 125) / 7) < 0.0001);
});

test("accepts genuine zeroes, rejects invalid values, and excludes incomplete calendar days", () => {
  const points = days.flatMap((day) => hour(day, 0));
  const extra = [null, NaN, -1, Infinity, "100", true].flatMap((value) => hour("2026-08-29", value));
  const result = buildHourlyBaseline([...points, ...extra, ...hour("2026-09-06"), ...hour("2026-09-07")], { now });
  assert.equal(result.hourlyByHour[9].baselineAvg, 0);
  assert.equal(result.samples, 28);
});

test("old coverage stays visible as a historical reference instead of disappearing", () => {
  const old = Array.from({ length: 10 }, (_, i) => hour(`2026-08-${String(i + 1).padStart(2, "0")}`)).flat();
  const result = buildHourlyBaseline(old, { now });
  assert.equal(result.hourlyByHour[9].distinctDays, 10);
  assert.equal(result.hourlyByHour[9].baselineAvg, 100);
  assert.equal(result.hourlyByHour[9].status, "historical-reference");
  assert.equal(result.hourlyByHour[9].lastDay, "2026-08-10");
  assert.equal(result.recentHours, 0);
  assert.equal(buildHourlyBaseline([...old, ...days.slice(-3).flatMap((day) => hour(day))], { now }).readyHours, 1);
});

test("counts a repeated autumn hour once and does not fabricate the missing spring hour", () => {
  const makeUtcHour = (timestamp) => Array.from({ length: 4 }, (_, index) => {
    const ts = Date.parse(timestamp) + index * HOURLY_SLOT_MS;
    return { ts, newestTs: ts, value: 100, signature };
  });
  const autumn = buildHourlyBaseline([
    ...makeUtcHour("2026-10-25T00:00:00Z"), ...makeUtcHour("2026-10-25T01:00:00Z"),
  ], { now: Date.parse("2026-10-26T12:00:00Z") });
  assert.equal(autumn.hourlyByHour[2].distinctDays, 1);
  assert.equal(autumn.hourlyByHour[2].samples, 8);
  const spring = buildHourlyBaseline([
    ...makeUtcHour("2026-03-29T00:00:00Z"), ...makeUtcHour("2026-03-29T01:00:00Z"),
  ], { now: Date.parse("2026-03-30T12:00:00Z") });
  assert.equal(spring.hourlyByHour[2].distinctDays, 0);
  assert.equal(spring.hourlyByHour[1].distinctDays, 1);
  assert.equal(spring.hourlyByHour[3].distinctDays, 1);
});

test("materializes once per Stockholm day even when no hours are ready", async () => {
  const baseline = { ...buildHourlyBaseline([], { now }), expansion: { version: 1 } };
  assert.equal(shouldReuseHourlyLobbyBaseline(baseline, now), true);
  assert.equal(shouldReuseHourlyLobbyBaseline(baseline, now + 86400000), false);
  assert.equal(shouldReuseHourlyLobbyBaseline({ ...baseline, signature: "different" }, now), false);
  const result = await loadHourlyLobbyBaseline({ now, getBaseline: async () => baseline,
    getObservations: async () => assert.fail("must not reread history"), setBaseline: async () => assert.fail("must not rewrite") });
  assert.equal(result, baseline);
});

test("failed reads preserve the previous result, but valid empty windows replace expired evidence", async () => {
  const old = buildHourlyBaseline(readyPoints(), { now: now - 86400000 });
  let writes = 0;
  await assert.rejects(loadHourlyLobbyBaseline({ now, getBaseline: async () => old,
    getObservations: async () => { throw new Error("read failed"); }, setBaseline: async () => { writes++; } }));
  assert.equal(writes, 0);
  await loadHourlyLobbyBaseline({ now, getBaseline: async () => old,
    getObservations: async () => [], getHistory: async () => null,
    getGameObservations: async () => [],
    setBaseline: async (value) => { assert.equal(value.readyHours, 0); writes++; } });
  assert.equal(writes, 1);
});

test("two readings must span twenty minutes, and seven independent days are still required", () => {
  const points = days.flatMap((day) => hour(day, 200, [0, 20]));
  assert.equal(buildHourlyBaseline(points, { now }).hourlyByHour[9].baselineAvg, 200);
  assert.equal(buildHourlyBaseline(points.slice(2), { now }).readyHours, 0);
  const close = days.flatMap((day) => hour(day, 200, [0, 10]));
  assert.equal(buildHourlyBaseline(close, { now }).readyHours, 0);
});

test("failed candidate reads preserve the published baseline", async () => {
  const old = buildHourlyBaseline(readyPoints(), { now: now - 86400000 });
  await assert.rejects(loadHourlyLobbyBaseline({ now, getBaseline: async () => old,
    getObservations: async () => [], getHistory: async () => null,
    getGameObservations: async () => { throw new Error("candidate read failed"); },
    setBaseline: async () => assert.fail("must not erase the published reference") }), /candidate read failed/);
});

test("a rejected concurrent publication returns the actually stored baseline", async () => {
  const published = { ...buildHourlyBaseline(readyPoints(), { now }), expansion: { version: 1 } };
  const result = await loadHourlyLobbyBaseline({ now, force: true, getBaseline: async () => published,
    getObservations: async () => [], getHistory: async () => null, getGameObservations: async () => [],
    setBaseline: async () => false });
  assert.equal(result, published);
});

test("archived readings are disclosed and never double-count overlapping verified observations", () => {
  const verified = readyPoints();
  const archived = verified.map((point) => ({ ...point, quality: "reconstructed", value: 10000 }));
  const historical = buildHourlyBaseline(archived, { now });
  assert.equal(historical.hourlyByHour[9].status, "historical-reference");
  assert.equal(historical.hourlyByHour[9].reconstructedDays, 7);
  const forward = buildHourlyBaseline([...archived, ...verified], { now });
  const reverse = buildHourlyBaseline([...verified, ...archived], { now });
  assert.deepEqual(forward, reverse);
  assert.equal(forward.hourlyByHour[9].baselineAvg, 100);
  assert.equal(forward.hourlyByHour[9].reconstructedDays, 0);
});
