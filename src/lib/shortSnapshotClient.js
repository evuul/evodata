// Normalizes short snapshot API payloads for client-side consumers.

export function normalizeShortSnapshotResponse(payload) {
  if (payload?.totalPercent == null || payload?.totalPercent === "") {
    return null;
  }

  const totalPercent = Number(payload.totalPercent);
  if (!Number.isFinite(totalPercent)) {
    return null;
  }

  return {
    totalPercent,
    observedDate: typeof payload?.observedDate === "string" ? payload.observedDate : null,
  };
}
