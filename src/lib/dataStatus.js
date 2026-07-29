// Normalizes source, observation time and quality for dashboard data disclosures.

const VALID_TYPES = new Set(["live", "reported", "model"]);

function parseObservedAt(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function buildDataStatus({
  type = "reported",
  source,
  observedAt = null,
  observedLabel = null,
  fallback = false,
  stale = false,
  maxAgeMs = null,
  now = Date.now(),
} = {}) {
  const normalizedType = VALID_TYPES.has(type) ? type : "reported";
  const normalizedSource = String(source || "").trim() || null;
  const observedAtMs = parseObservedAt(observedAt);
  const ageMs = observedAtMs == null ? null : Math.max(0, now - observedAtMs);
  const expired = Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && ageMs != null && ageMs > maxAgeMs;

  return {
    type: normalizedType,
    quality: fallback ? "fallback" : stale || expired ? "stale" : "fresh",
    source: normalizedSource,
    observedAt: observedAtMs == null ? null : new Date(observedAtMs).toISOString(),
    observedLabel: String(observedLabel || "").trim() || null,
    ageMs,
  };
}
