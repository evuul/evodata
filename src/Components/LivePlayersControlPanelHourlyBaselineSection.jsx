"use client";

// Presents the premium hourly lobby baseline as a dedicated dashboard view.

import React from "react";
import { Box, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";

export default function LivePlayersControlPanelHourlyBaselineSection({
  rows,
  coverage,
  updatedLabel,
  loading,
  error,
  numberFormatter,
  percentFormatter,
  translate,
}) {
  const historyCoverageText = coverage?.distinctDays && coverage?.requestedDays
    ? translate(
        `Historik: ${coverage.distinctDays} av ${coverage.requestedDays} dagar`,
        `History: ${coverage.distinctDays} of ${coverage.requestedDays} days`
      )
    : translate("Historisk datatäckning beräknas", "Historical coverage is being calculated");
  const gameCoverageText = coverage?.comparableGames != null && coverage?.healthyGames != null
    ? translate(
        `Live-spel: ${coverage.comparableGames} av ${coverage.healthyGames}`,
        `Live games: ${coverage.comparableGames} of ${coverage.healthyGames}`
      )
    : null;
  const showIncompleteWarning = coverage?.isComplete === false;
  const daysRemaining = coverage?.remainingDays;

  return (
    <Box
      sx={{
        width: "100%",
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(56,189,248,0.28)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between">
        <Stack spacing={0.4}>
          <Stack direction="row" spacing={0.9} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Typography variant="overline" sx={{ color: "#7dd3fc", letterSpacing: 1.2, fontWeight: 700 }}>
              {translate("Timsnitt vs live nu", "Hourly baseline vs live now")}
            </Typography>
            <Chip
              icon={<WorkspacePremiumRounded sx={{ "&.MuiChip-icon": { color: "#fde68a" } }} />}
              label={translate("Founder / Premium", "Founder / Premium")}
              size="small"
              sx={{
                color: "#fde68a",
                backgroundColor: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.28)",
                fontWeight: 700,
              }}
            />
          </Stack>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
            {translate(
              "Jämför nuvarande live-total med det historiska snittet för varje klockslag.",
              "Compares the current live total with the historical average for each hour."
            )}
          </Typography>
        </Stack>
        <Stack spacing={0.3} sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.82)" }}>
            {historyCoverageText}
          </Typography>
          {gameCoverageText ? (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.62)" }}>
              {gameCoverageText}
            </Typography>
          ) : null}
          {updatedLabel ? (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.62)" }}>
              {translate(`Live uppdaterad ${updatedLabel}`, `Live updated ${updatedLabel}`)}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      {showIncompleteWarning ? (
        <Box
          role="status"
          sx={{
            borderRadius: "10px",
            border: "1px solid rgba(245,158,11,0.38)",
            backgroundColor: "rgba(245,158,11,0.09)",
            px: 1.5,
            py: 1.15,
          }}
        >
          <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 700 }}>
            {translate(
              `Timhistorik byggs från den kompletta lobbyn${daysRemaining ? `. Cirka ${daysRemaining} dagar återstår till 60 dagars historik` : ""}. Fram tills dess baseras snitten på färre dagar och kan vara mindre stabila.`,
              `Hourly history is building from the complete lobby${daysRemaining ? `. Approximately ${daysRemaining} days remain until 60 days of history` : ""}. Until then, averages use fewer days and may be less stable.`
            )}
          </Typography>
        </Box>
      ) : null}

      {loading && !rows.length ? (
        <Box sx={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.78)" }}>
            {translate("Laddar timjämförelsen…", "Loading hourly comparison…")}
          </Typography>
        </Box>
      ) : error && !rows.length ? (
        <Box sx={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#fca5a5" }}>
            {translate("Timjämförelsen kunde inte laddas just nu.", "The hourly comparison could not be loaded right now.")}
          </Typography>
        </Box>
      ) : rows.length ? (
        <Grid container spacing={1.2}>
          {rows.map((row) => {
            const deltaText = Number.isFinite(row.delta)
              ? `${row.delta > 0 ? "+" : ""}${percentFormatter.format(row.delta)}%`
              : "—";
            const deltaColor = Number.isFinite(row.delta) && row.delta > 0
              ? "#86efac"
              : Number.isFinite(row.delta) && row.delta < 0
                ? "#fca5a5"
                : "rgba(226,232,240,0.8)";

            return (
              <Grid key={`hourly-${row.hour}`} item xs={12} sm={6} md={4} lg={3}>
                <Box
                  sx={{
                    height: "100%",
                    borderRadius: "12px",
                    border: row.isCurrentHour
                      ? "1px solid rgba(56,189,248,0.62)"
                      : "1px solid rgba(148,163,184,0.25)",
                    background: row.isCurrentHour ? "rgba(56,189,248,0.1)" : "rgba(2,6,23,0.34)",
                    boxShadow: row.isCurrentHour ? "0 0 0 1px rgba(56,189,248,0.08)" : "none",
                    p: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.45,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.95)", fontWeight: 800 }}>
                      {row.hour}:00
                    </Typography>
                    {row.isCurrentHour ? (
                      <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 800 }}>
                        {translate("NU", "NOW")}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                    {translate("Snitt", "Avg")}: {numberFormatter.format(row.baseline)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                    {translate("Live", "Live")}: {row.currentTotal != null ? numberFormatter.format(row.currentTotal) : "—"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: deltaColor, fontWeight: 700 }}>
                    {translate("Diff", "Delta")}: {deltaText}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
                    {translate("Spel", "Games")}: {numberFormatter.format(row.comparableGames)} ·{" "}
                    {translate("Mätpunkter", "Samples")}: {numberFormatter.format(row.samples)}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.78)" }}>
            {translate("Timjämförelsen förbereds och blir tillgänglig snart.", "The hourly comparison is being prepared and will be available soon.")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
