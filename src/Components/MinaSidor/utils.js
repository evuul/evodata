export const formatSek = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " SEK"
    : "–";

export const formatPercent = (value) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "–";

export const formatPercentPrecise = (value, digits = 3) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}%` : "–";

export const formatOwnershipPercent = (value) => {
  if (!Number.isFinite(value)) return "–";
  const abs = Math.abs(value);
  let digits = 4;
  if (abs < 0.001) digits = 7;
  else if (abs < 0.01) digits = 6;
  else if (abs < 0.1) digits = 5;
  return `${value.toFixed(digits)}%`;
};

export const formatDate = (value) => {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE");
};
