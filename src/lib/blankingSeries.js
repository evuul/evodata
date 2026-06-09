export const normalizeBlankingItems = (items) => {
  if (!Array.isArray(items) || !items.length) return [];

  const byDate = new Map();
  for (const item of items) {
    const date = String(item?.date ?? "").trim();
    const percent = Number(item?.percent);
    if (!date || !Number.isFinite(percent)) continue;
    byDate.set(date, +percent.toFixed(2));
  }

  const sorted = Array.from(byDate.entries()).sort(([left], [right]) => left.localeCompare(right));
  return sorted.map(([date, percent], idx, arr) => {
    const prevPercent = idx > 0 ? Number(arr[idx - 1][1]) : null;
    const delta =
      prevPercent != null && Number.isFinite(prevPercent) && Number.isFinite(percent)
        ? Number((percent - prevPercent).toFixed(2))
        : null;
    return { date, percent, delta };
  });
};

export const mergeLiveBlankingPoint = (items, liveSnapshot = null) => {
  const merged = Array.isArray(items) ? items.slice() : [];
  const liveDate = String(liveSnapshot?.observedDate ?? "").trim();
  const livePercent = Number(liveSnapshot?.totalPercent);
  if (liveDate && Number.isFinite(livePercent)) {
    merged.push({ date: liveDate, percent: livePercent });
  }
  return normalizeBlankingItems(merged);
};
