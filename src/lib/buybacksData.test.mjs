// Regression tests for the static buyback data snapshots.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getRowsByDates(rows, dates) {
  return dates.map((date) => rows.find((row) => row.Datum === date));
}

test("new Evolution buyback block is present in both historical snapshots", () => {
  const current = readJson(new URL("../app/data/buybackData.json", import.meta.url));
  const historical = readJson(new URL("../app/data/oldBuybackData.json", import.meta.url));
  const dates = [
    "2026-05-19",
    "2026-05-20",
    "2026-05-21",
    "2026-05-22",
    "2026-05-25",
    "2026-05-26",
    "2026-05-27",
    "2026-05-28",
    "2026-05-29",
    "2026-06-01",
    "2026-06-02",
    "2026-06-03",
    "2026-06-04",
    "2026-06-05",
  ];

  const currentRows = getRowsByDates(current, dates);
  const historicalRows = getRowsByDates(historical, dates);

  for (const row of currentRows) assert.ok(row, "missing row in current snapshot");
  for (const row of historicalRows) assert.ok(row, "missing row in historical snapshot");

  assert.equal(
    currentRows.reduce((sum, row) => sum + row.Antal_aktier, 0),
    2066158,
  );
  assert.equal(
    historicalRows.reduce((sum, row) => sum + row.Antal_aktier, 0),
    2066158,
  );
  assert.deepEqual(
    currentRows.map((row) => row.Datum),
    dates,
  );
  assert.deepEqual(
    historicalRows.map((row) => row.Datum),
    dates,
  );
});

test("new Evolution buyback block average price is computed from the latest week only", () => {
  const current = readJson(new URL("../app/data/buybackData.json", import.meta.url));
  const weekRows = current.filter((row) => row.Datum >= "2026-06-01" && row.Datum <= "2026-06-05");
  const totalShares = weekRows.reduce((sum, row) => sum + row.Antal_aktier, 0);
  const totalValue = weekRows.reduce((sum, row) => sum + row.Transaktionsvärde, 0);
  const averagePrice = totalShares > 0 ? totalValue / totalShares : 0;

  assert.equal(totalShares, 838171);
  assert.ok(Math.abs(averagePrice - 704.6032310948481) < 0.000001);
});
