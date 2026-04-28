'use client';

// Compact metric summary cards for the financial overview card.

import { Box, Stack, Typography } from "@mui/material";

export default function FinancialOverviewCardMetricSummaryColumn({ translate, metricSummaries }) {
  return (
    <Box sx={{ display: "flex" }}>
      <Stack spacing={2.5} sx={{ height: "100%", width: "100%" }}>
        {metricSummaries.map((summary) => (
          <Box
            key={summary.metric}
            sx={{
              background: summary.background,
              borderRadius: "14px",
              border: summary.active ? `1px solid ${summary.accent}` : "1px solid rgba(148,163,184,0.18)",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              width: "100%",
              transition: "border 0.2s ease, transform 0.2s ease",
              transform: summary.active ? "translateY(-2px)" : "none",
            }}
          >
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem", fontWeight: 600 }}>
              {summary.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#f8fafc" }}>
              {summary.valueLabel}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              {summary.changeText}
            </Typography>
            {summary.periodLabel && (
              <Typography sx={{ color: "rgba(148,163,184,0.65)", fontSize: "0.8rem" }}>
                {translate("Senast", "Latest")}: {summary.periodLabel}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
