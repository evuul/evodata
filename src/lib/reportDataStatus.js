// Labels financial report context without mistaking request time for observation time.

import { findLatestReport } from "./reportUtils.js";
import { buildDataStatus } from "./dataStatus.js";

export function buildReportDataStatus(data, { model = false } = {}) {
  const reports = (Array.isArray(data?.financialReports) ? data.financialReports : [])
    .filter((report) => Number.isInteger(Number(report?.year)) && /^Q[1-4]$/.test(report?.quarter));
  const latest = findLatestReport(reports);
  if (!latest) return null;
  return buildDataStatus({
    type: model ? "model" : "reported",
    source: "Evolution",
    observedLabel: `${latest.quarter} ${latest.year}`,
    fallback: Boolean(data?._meta?.fallback),
    stale: Boolean(data?._meta?.stale),
  });
}
