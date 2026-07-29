// Validates public buyback query values and protected MFN synchronization targets.

const ALLOWED_COMPLIANCE_RANGES = new Set(["1mo", "3mo", "6mo", "1y", "2y", "5y"]);

export function normalizeComplianceRange(value, fallback = "1y") {
  const normalized = String(value || "").trim();
  return ALLOWED_COMPLIANCE_RANGES.has(normalized) ? normalized : fallback;
}

export function normalizeIsoDate(value, fallback) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return fallback;

  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized
    ? fallback
    : normalized;
}

export function normalizeMfnUrl(value) {
  if (value == null || value === "") return null;

  try {
    const url = new URL(String(value));
    const allowedHost = url.hostname === "mfn.se" || url.hostname === "www.mfn.se";
    if (url.protocol !== "https:" || !allowedHost) return null;
    return url.toString();
  } catch {
    return null;
  }
}
