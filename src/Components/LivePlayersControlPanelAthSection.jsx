"use client";

// ATH section for the live players control panel.

import React, { useMemo } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

export default function LivePlayersControlPanelAthSection({
  athRows,
  athDays,
  dayOptions,
  initialVisibleCount,
  onChangeDays,
  overviewLoading,
  overviewError,
  showAllAth,
  toggleShowAll,
  numberFormatter,
  translate,
  formatDateTime,
}) {
  const visibleRows = useMemo(
    () => (showAllAth ? athRows : athRows.slice(0, initialVisibleCount)),
    [athRows, showAllAth, initialVisibleCount]
  );
  const isLoading = overviewLoading && athRows.length === 0;
  const showError = Boolean(overviewError) && athRows.length === 0;
  const isEmpty = athRows.length === 0 && !isLoading && !showError;

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
      >
        <Stack spacing={0.4}>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
            {translate("All-Time High (ATH) & Senaste", "All-Time High (ATH) & Latest")}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
            {isLoading
              ? translate("Hämtar toppdata…", "Fetching peak data…")
              : showError
              ? translate(`Fel: ${overviewError}`, `Error: ${overviewError}`)
              : athRows.length
              ? translate(
                  `Topplista baserad på de senaste ${athDays} dagarna`,
                  `Leaderboard based on the past ${athDays} days`
                )
              : translate("Ingen toppdata tillgänglig ännu.", "No peak data available yet.")}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          value={athDays}
          exclusive
          onChange={(_, value) => value && onChangeDays(value)}
          size="small"
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
          }}
        >
          {dayOptions.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.75)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.5, md: 2 },
                "&.Mui-selected": {
                  color: "#f8fafc",
                  backgroundColor: "rgba(192,132,252,0.28)",
                },
              }}
            >
              {option} d
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3, gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#c084fc" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            {translate("Hämtar toppdata…", "Fetching peak data…")}
          </Typography>
        </Box>
      ) : showError ? (
        <Typography sx={{ color: "#fecaca" }}>
          {translate(`Fel: ${overviewError}`, `Error: ${overviewError}`)}
        </Typography>
      ) : isEmpty ? (
        <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
          {translate("Ingen ATH-data tillgänglig.", "No ATH data available.")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {visibleRows.map((row, index) => (
            <Box
              key={row.slug}
              sx={{
                background: "rgba(15,23,42,0.55)",
                borderRadius: "12px",
                border: `1px solid ${row.color}55`,
                p: 1.25,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
                  <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                    #{index + 1} {row.label}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      {translate("ATH", "ATH")}
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.ath?.value != null ? numberFormatter.format(row.ath.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.ath?.at ? formatDateTime(row.ath.at) : ""}
                    </Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(148,163,184,0.2)" }} />
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      {translate("Senaste", "Latest")}
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.latest?.value != null ? numberFormatter.format(row.latest.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.latest?.at ? formatDateTime(row.latest.at) : ""}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          ))}

          {athRows.length > visibleRows.length && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <Chip
                label={showAllAth ? translate("Visa mindre", "Show less") : translate("Visa fler", "Show more")}
                onClick={toggleShowAll}
                clickable
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  color: "#cbd5f5",
                  borderRadius: "999px",
                }}
              />
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
