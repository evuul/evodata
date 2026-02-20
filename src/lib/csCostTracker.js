const WINDOW_HOURS_DEFAULT = 72;
const WINDOW_HOURS_MAX = 24 * 14;

const g = globalThis;
if (!g.__CS_COST_TRACKER__) {
  g.__CS_COST_TRACKER__ = {
    startedAt: new Date().toISOString(),
    buckets: {},
  };
}

function toHourKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 13);
}

function keepRecentBuckets(state) {
  const minTs = Date.now() - WINDOW_HOURS_MAX * 60 * 60 * 1000;
  for (const key of Object.keys(state.buckets || {})) {
    const parsed = Date.parse(`${key}:00:00.000Z`);
    if (!Number.isFinite(parsed) || parsed < minTs) {
      delete state.buckets[key];
    }
  }
}

function ensureBucket(state, hourKey) {
  if (!state.buckets[hourKey]) {
    state.buckets[hourKey] = {
      totalRequests: 0,
      cronRequests: 0,
      includeHourlyRequests: 0,
      sampleWrites: 0,
      sampleWriteAvoided: 0,
      byEndpoint: {},
    };
  }
  return state.buckets[hourKey];
}

export function recordCostEvent({
  endpoint = "unknown",
  isCron = false,
  includeHourly = false,
  sampleWrites = 0,
  sampleWriteAvoided = 0,
} = {}) {
  const state = g.__CS_COST_TRACKER__;
  keepRecentBuckets(state);
  const hourKey = toHourKey();
  const bucket = ensureBucket(state, hourKey);

  bucket.totalRequests += 1;
  if (isCron) bucket.cronRequests += 1;
  if (includeHourly) bucket.includeHourlyRequests += 1;
  if (Number.isFinite(sampleWrites) && sampleWrites > 0) {
    bucket.sampleWrites += Math.round(sampleWrites);
  }
  if (Number.isFinite(sampleWriteAvoided) && sampleWriteAvoided > 0) {
    bucket.sampleWriteAvoided += Math.round(sampleWriteAvoided);
  }

  const endpointKey = String(endpoint || "unknown").trim() || "unknown";
  if (!bucket.byEndpoint[endpointKey]) bucket.byEndpoint[endpointKey] = 0;
  bucket.byEndpoint[endpointKey] += 1;
}

export function getCostSnapshot(hoursRaw = WINDOW_HOURS_DEFAULT) {
  const hours = Math.min(
    WINDOW_HOURS_MAX,
    Math.max(1, Number.isFinite(Number(hoursRaw)) ? Number(hoursRaw) : WINDOW_HOURS_DEFAULT)
  );
  const state = g.__CS_COST_TRACKER__;
  keepRecentBuckets(state);

  const minTs = Date.now() - hours * 60 * 60 * 1000;
  const rows = Object.entries(state.buckets)
    .map(([hour, value]) => ({ hour, ...value }))
    .filter((row) => {
      const ts = Date.parse(`${row.hour}:00:00.000Z`);
      return Number.isFinite(ts) && ts >= minTs;
    })
    .sort((a, b) => (a.hour < b.hour ? -1 : 1));

  const totals = {
    totalRequests: 0,
    cronRequests: 0,
    includeHourlyRequests: 0,
    sampleWrites: 0,
    sampleWriteAvoided: 0,
  };
  const endpointTotals = {};

  for (const row of rows) {
    totals.totalRequests += Number(row.totalRequests || 0);
    totals.cronRequests += Number(row.cronRequests || 0);
    totals.includeHourlyRequests += Number(row.includeHourlyRequests || 0);
    totals.sampleWrites += Number(row.sampleWrites || 0);
    totals.sampleWriteAvoided += Number(row.sampleWriteAvoided || 0);
    const byEndpoint = row.byEndpoint && typeof row.byEndpoint === "object" ? row.byEndpoint : {};
    for (const [endpoint, count] of Object.entries(byEndpoint)) {
      endpointTotals[endpoint] = (endpointTotals[endpoint] || 0) + Number(count || 0);
    }
  }

  const endpoints = Object.entries(endpointTotals)
    .map(([endpoint, requests]) => ({ endpoint, requests }))
    .sort((a, b) => b.requests - a.requests);

  return {
    startedAt: state.startedAt,
    generatedAt: new Date().toISOString(),
    windowHours: hours,
    totals,
    endpoints,
    hours: rows,
    notes: [
      "Instance-local tracker (resets on restart/deploy).",
      "sampleWriteAvoided = requests where public route did not write samples.",
    ],
  };
}
