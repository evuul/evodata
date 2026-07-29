"use client";

// Renders compact source and freshness disclosure for a dashboard metric.

import { Box, Chip, Typography } from "@mui/material";

const STATUS_COLORS = {
  fresh: { color: "#a7f3d0", border: "rgba(52,211,153,0.3)", background: "rgba(16,185,129,0.12)" },
  stale: { color: "#fde68a", border: "rgba(245,158,11,0.32)", background: "rgba(180,83,9,0.14)" },
  fallback: { color: "#fecaca", border: "rgba(248,113,113,0.32)", background: "rgba(153,27,27,0.14)" },
};

function formatObserved(status, locale) {
  if (status?.observedLabel) return status.observedLabel;
  if (!status?.observedAt) return null;

  const date = new Date(status.observedAt);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function DataStatusLine({ status, locale = "sv", translate }) {
  if (!status) return null;

  const palette = STATUS_COLORS[status.quality] ?? STATUS_COLORS.fresh;
  const statusLabel =
    status.quality === "fallback"
      ? translate("Fallback", "Fallback")
      : status.quality === "stale"
        ? translate("Äldre data", "Older data")
        : status.type === "live"
          ? translate("Live", "Live")
          : status.type === "model"
            ? translate("Modell", "Model")
            : translate("Rapporterat", "Reported");
  const observed = formatObserved(status, locale);
  const details = [status.source, observed].filter(Boolean).join(" · ");

  return (
    <Box sx={{ mt: "auto", pt: 1.5, display: "flex", alignItems: "center", gap: 0.8, minWidth: 0 }}>
      <Chip
        label={statusLabel}
        size="small"
        sx={{
          height: 21,
          color: palette.color,
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.background,
          fontSize: "0.66rem",
          fontWeight: 700,
          "& .MuiChip-label": { px: 0.8 },
        }}
      />
      {details ? (
        <Typography
          variant="caption"
          title={details}
          sx={{ color: "rgba(203,213,225,0.62)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {details}
        </Typography>
      ) : null}
    </Box>
  );
}
