export const formatSek = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " SEK"
    : "–";

export const formatPercent = (value) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "–";

export const formatPercentPrecise = (value, digits = 3) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}%` : "–";

export const formatDate = (value) => {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE");
};
