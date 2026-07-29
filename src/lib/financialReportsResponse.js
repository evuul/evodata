// Validates and annotates financial report payloads without changing their public data shape.

export function buildFinancialReportsPayload(data, {
  source,
  fallback = false,
  servedAt = new Date().toISOString(),
} = {}) {
  if (!data || typeof data !== "object" || !Array.isArray(data.financialReports)) {
    throw new Error("Invalid financial reports payload");
  }
  return {
    ...data,
    _meta: {
      source: String(source || "unknown"),
      fallback: Boolean(fallback),
      servedAt,
    },
  };
}
