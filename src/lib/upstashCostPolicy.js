// Defines bounded refresh policies that prevent avoidable Upstash work.

export function shouldRunScheduledAggregation({ scheduled, dryRun, force }) {
  return Boolean(scheduled || dryRun || force);
}

export function shouldSkipMaterializedRefresh({ materializedAt, now = Date.now(), minIntervalMs }) {
  const previous = Date.parse(String(materializedAt || ""));
  const current = Number(now);
  const interval = Number(minIntervalMs);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || !Number.isFinite(interval) || interval <= 0) {
    return false;
  }
  const age = current - previous;
  return age >= 0 && age < interval;
}
