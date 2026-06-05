import test from "node:test";
import assert from "node:assert/strict";

import {
  extractTotalPercentFromEmittentHtml,
  parseCurrentPositions,
  parseFiPercent,
} from "./fiShortRegister.js";

const sampleHtml = `
<html>
  <body>
    <h3>Evolution AB (publ)</h3>
    <div>LEI-kod 549300SUH6ZR1RF6TA88</div>
    <div>Summa procent 5,34</div>
    <h2>Aktuella positioner</h2>
    <table>
      <thead>
        <tr>
          <th>Positionsinnehavare</th>
          <th>ISIN</th>
          <th>Position i procent (%)</th>
          <th>Positionsdatum</th>
          <th>Föregående Position (%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>GREENVALE CAPITAL LLP</td>
          <td>SE0012673267</td>
          <td>0,85</td>
          <td>2026-06-04</td>
          <td>0,9</td>
        </tr>
        <tr>
          <td>BlackRock Investment Management (UK) Limited</td>
          <td>SE0012673267</td>
          <td>0,56</td>
          <td>2026-05-19</td>
          <td>0,6</td>
        </tr>
      </tbody>
    </table>
    <h2>Historiska positioner</h2>
    <table>
      <thead>
        <tr>
          <th>Positionsinnehavare</th>
          <th>ISIN</th>
          <th>Position i procent (%)</th>
          <th>Positionsdatum</th>
          <th>Efterföljande Position (%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Marshall Wace LLP</td>
          <td>SE0012673267</td>
          <td>0,62</td>
          <td>2026-05-13</td>
          <td>&lt;0,5</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

test("parseFiPercent handles Swedish comma decimals and thresholds", () => {
  assert.equal(parseFiPercent("5,34"), 5.34);
  assert.equal(parseFiPercent(" 0,9 "), 0.9);
  assert.equal(parseFiPercent("<0,5"), null);
});

test("extractTotalPercentFromEmittentHtml reads the current total", () => {
  assert.equal(extractTotalPercentFromEmittentHtml(sampleHtml), 5.34);
});

test("parseCurrentPositions returns only the current positions table", () => {
  const positions = parseCurrentPositions(sampleHtml);

  assert.equal(positions.length, 2);
  assert.deepEqual(positions[0], {
    holder: "GREENVALE CAPITAL LLP",
    isin: "SE0012673267",
    positionPercent: 0.85,
    positionPercentRaw: "0,85",
    positionsDate: "2026-06-04",
    previousPositionPercent: 0.9,
    previousPositionPercentRaw: "0,9",
  });
  assert.equal(positions[1].holder, "BlackRock Investment Management (UK) Limited");
  assert.equal(positions[1].positionsDate, "2026-05-19");
});
