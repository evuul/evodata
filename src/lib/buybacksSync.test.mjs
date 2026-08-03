// Verifies that the MFN buyback importer accepts the current table markup.

import test from "node:test";
import assert from "node:assert/strict";
import { parseBuybackFromMfnHtml } from "./buybacksSync.js";

test("parses MFN tables with presentation attributes", () => {
  const rows = parseBuybackFromMfnHtml(`
    <div class="table-wrapper"><table style="width: 100%"><tbody>
      <tr><td>Date</td><td>Volume</td><td>Average price</td><td>Transaction value</td></tr>
      <tr><td>2026-07-27</td><td> 196,356</td><td>730.0545</td><td>143,350,581.40</td></tr>
    </tbody></table></div>
  `);

  assert.deepEqual(rows, [{
    Datum: "2026-07-27",
    Antal_aktier: 196_356,
    Snittkurs: 730.0545,
    Transaktionsvärde: 143_350_581.4,
  }]);
});
