"use client";

// Summarizes historical forecast accuracy and directional model bias.

import { Box, Typography } from "@mui/material";

const formatPercent = (value, { signed = false } = {}) => {
  if (!Number.isFinite(value)) return "–";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

function AccuracyMetric({ label, value, helper, color }) {
  return (
    <Box
      sx={{
        border: "1px solid rgba(148,163,184,0.16)",
        borderRadius: "12px",
        background: "rgba(15,23,42,0.4)",
        px: 1.8,
        py: 1.5,
      }}
    >
      <Typography
        sx={{
          color: "rgba(148,163,184,0.78)",
          fontSize: "0.72rem",
          fontWeight: 750,
          letterSpacing: 0.55,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ color, fontSize: "1.28rem", fontWeight: 800, mt: 0.45 }}>
        {value}
      </Typography>
      <Typography sx={{ color: "rgba(226,232,240,0.62)", fontSize: "0.76rem", mt: 0.2 }}>
        {helper}
      </Typography>
    </Box>
  );
}

export default function ForecastAccuracySummary({ summary, translate }) {
  if (!summary || summary.sampleSize === 0) return null;

  const biasDirection = summary.meanBiasPercent > 0
    ? translate("modellen överskattar", "model overestimates")
    : summary.meanBiasPercent < 0
      ? translate("modellen underskattar", "model underestimates")
      : translate("ingen riktad avvikelse", "no directional bias");
  const hitRateColor = summary.withinRangePercent >= 75 ? "#6ee7b7" : "#fde68a";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
        gap: 1.2,
        mb: 2.2,
      }}
    >
      <AccuracyMetric
        label={translate("Medianfel", "Median error")}
        value={formatPercent(summary.medianAbsoluteErrorPercent)}
        helper={translate(
          `${summary.sampleSize} jämförbara kvartal`,
          `${summary.sampleSize} comparable quarters`,
        )}
        color="#93c5fd"
      />
      <AccuracyMetric
        label={translate("Modellbias", "Model bias")}
        value={formatPercent(summary.meanBiasPercent, { signed: true })}
        helper={biasDirection}
        color={Math.abs(summary.meanBiasPercent) <= 2 ? "#6ee7b7" : "#fde68a"}
      />
      <AccuracyMetric
        label={translate("Inom intervallet", "Inside range")}
        value={formatPercent(summary.withinRangePercent)}
        helper={translate(
          `${summary.withinRangeCount} av ${summary.sampleSize} inom ±${summary.tolerancePercent.toFixed(1)}%`,
          `${summary.withinRangeCount} of ${summary.sampleSize} within ±${summary.tolerancePercent.toFixed(1)}%`,
        )}
        color={hitRateColor}
      />
    </Box>
  );
}
