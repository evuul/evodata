export const formatSek = (value) => {
  if (!Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mdkr`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mkr`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Tkr`;
  }
  return `${value.toLocaleString("sv-SE")} kr`;
};
