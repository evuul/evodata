// Validates and prepares supporter records for the public Founders directory.

const MAX_NAME_LENGTH = 80;
const MAX_ID_LENGTH = 64;

const normalizeText = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
};

const normalizeDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return value;
};

const normalizeProfileUrl = (value) => {
  if (value == null || value === "") return null;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export function buildPublishedFounders(records) {
  if (!Array.isArray(records)) return [];

  const seenIds = new Set();
  return records
    .map((record) => {
      if (record?.qualified !== true || record?.consentToPublish !== true) return null;
      const id = normalizeText(record.id, MAX_ID_LENGTH);
      const displayName = normalizeText(record.displayName, MAX_NAME_LENGTH);
      const recognizedAt = normalizeDate(record.recognizedAt);
      if (!id || !displayName || !recognizedAt || seenIds.has(id)) return null;
      seenIds.add(id);
      return {
        id,
        displayName,
        recognizedAt,
        profileUrl: normalizeProfileUrl(record.profileUrl),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.recognizedAt.localeCompare(right.recognizedAt) ||
        left.displayName.localeCompare(right.displayName, "sv")
    );
}
