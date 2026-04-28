'use client';

// Summary cards used alongside the wide financial overview chart.

import { Box, Stack, Typography } from "@mui/material";

export default function FinancialOverviewCardWideSummaryColumn({ translate, wideMetric, wideSummaryCards }) {
  return (
    <Box sx={{ height: { xs: "auto", lg: "100%" } }}>
      <Stack spacing={2} sx={{ height: { xs: "auto", lg: "100%" } }}>
        {wideSummaryCards.map((summary) => {
          const isActive = summary.metric === wideMetric;
          return (
            <Box
              key={`wide-summary-${summary.metric}`}
              sx={{
                background: isActive ? summary.background : "rgba(15,23,42,0.55)",
                borderRadius: "16px",
                border: isActive ? `1px solid ${summary.accent}` : "1px solid rgba(148,163,184,0.18)",
                p: 2.2,
                boxShadow: isActive ? `0 0 18px ${summary.accent}33` : "none",
                transition: "all 0.2s ease",
                flex: { xs: "unset", lg: 1 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem", fontWeight: 600 }}>
                {summary.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                {summary.valueLabel}
              </Typography>
              <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem" }}>
                {summary.changeText}
              </Typography>
              {summary.periodLabel && (
                <Typography sx={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem" }}>
                  {translate("Senast", "Latest")}: {summary.periodLabel}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
