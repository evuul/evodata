// Shared helpers for live header labels and top-win formatting.

export const parseTopWinTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
};

export const prettifyGameShowName = (value) => {
  if (!value) return "";
  const stringValue = String(value);
  if (!stringValue.includes("_")) return stringValue;
  return stringValue
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const extractLatestTopWin = (entries) => {
  if (!Array.isArray(entries)) return null;
  const normalized = entries
    .map((entry) => {
      const totalAmount = Number(entry?.totalAmount ?? entry?.amount ?? entry?.total);
      const multiplier = Number(entry?.multiplier ?? entry?.multi ?? entry?.x);
      const settledAt = entry?.settledAt ?? entry?.startedAt ?? entry?.createdAt ?? null;
      const gameShow = entry?.gameShow ?? entry?.game ?? entry?.name ?? null;
      return {
        gameShow,
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : null,
        multiplier: Number.isFinite(multiplier) ? multiplier : null,
        settledAt,
      };
    })
    .filter((item) => item.gameShow && item.totalAmount != null);

  if (!normalized.length) return null;
  normalized.sort((a, b) => parseTopWinTimestamp(b.settledAt) - parseTopWinTimestamp(a.settledAt));
  return normalized[0];
};

export const parseDisplayNumber = (value) => {
  if (typeof value === "number") return value;
  if (value == null) return NaN;
  return Number(String(value).replace(/\u00A0/g, " ").replace(/\s/g, "").replace(/[^\d.-]/g, ""));
};

export const formatLobbyAthLabel = (lobbyAth, translate, mobile = false) => {
  const raw = lobbyAth?.value;
  const val = parseDisplayNumber(raw);
  if (!Number.isFinite(val)) return null;
  const date = lobbyAth?.date ? lobbyAth.date : null;
  const num = val.toLocaleString("sv-SE");
  const title = translate("Lobby ATH", "Lobby ATH");
  if (mobile) return `${title}: ${num}`;
  return date ? `${title}: ${num} (${date})` : `${title}: ${num}`;
};

export const formatLatestWinTime = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatLatestWinAmount = (value, locale) => {
  if (!Number.isFinite(value)) return null;
  const localeKey = locale === "en" ? "en-US" : "sv-SE";
  const options =
    value >= 10_000
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 1, maximumFractionDigits: 1 };
  return `${value.toLocaleString(localeKey, options)} €`;
};
