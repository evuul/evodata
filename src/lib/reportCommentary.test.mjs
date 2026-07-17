// Verifies that the published report commentary follows the available quarterly data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (relativePath) => {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
};

const quarterIndex = (period) => {
  const match = /^(Q[1-4])-(\d{4})$/.exec(period);
  assert.ok(match, `Invalid commentary period: ${period}`);
  return Number(match[2]) * 4 + Number(match[1].slice(1));
};

test("latest commentary matches the latest financial report", async () => {
  const [commentary, reportData] = await Promise.all([
    readJson("../app/data/reportCommentary.json"),
    readJson("../app/data/financialReports.json"),
  ]);

  const latestCommentaryPeriod = Object.keys(commentary).sort(
    (left, right) => quarterIndex(left) - quarterIndex(right)
  ).at(-1);
  const latestReport = reportData.financialReports
    .map((report) => ({
      ...report,
      index: report.year * 4 + Number(report.quarter.slice(1)),
    }))
    .sort((left, right) => left.index - right.index)
    .at(-1);

  assert.equal(latestCommentaryPeriod, `${latestReport.quarter}-${latestReport.year}`);
});

test("Q2 2026 commentary contains complete Swedish and English copy", async () => {
  const commentary = await readJson("../app/data/reportCommentary.json");
  const q2 = commentary["Q2-2026"];

  assert.equal(q2.publishedAt, "2026-07-17");
  assert.ok(q2.positives.length > 0);
  assert.equal(q2.positivesEn.length, q2.positives.length);
  assert.ok(q2.negatives.length > 0);
  assert.equal(q2.negativesEn.length, q2.negatives.length);

  for (const field of ["outlook", "outlookEn", "buybacks", "buybacksEn"]) {
    assert.ok(q2[field]?.trim(), `${field} should contain published copy`);
  }
});
