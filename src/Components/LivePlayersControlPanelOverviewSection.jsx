"use client";

// Overview cards and hourly baseline section for the live players control panel.

import React from "react";
import { Box, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";

export default function LivePlayersControlPanelOverviewSection({
  translate,
  numberFormatter,
  percentFormatter,
  loadingLive,
  totalLiveDisplayValue,
  playersUpdatedText,
  hourlyComparisonMeta,
  lobbyBoostOn,
  onToggleLobbyBoost,
  overviewLoading,
  todayPeakDisplayValue,
  todayPeakMetaText,
  yesterdayPeakDisplayValue,
  yesterdayPeakMetaText,
  showYesterdayPeakCard,
  lobbyAthDisplay,
  topGrowthDisplay,
  topGrowthUseMa,
  topGrowthDays,
  hourlyByHourRows,
  stuckLiveGamesCount,
}) {
  return (
    <Stack spacing={{ xs: 2, md: 3 }} sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            display: "inline-flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: { xs: 2, md: 3 },
            width: "100%",
            maxWidth: showYesterdayPeakCard ? 1712 : 1368,
          }}
        >
          <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(52,211,153,0.45)",
                p: { xs: 2, md: 2.5 },
                width: { xs: "100%", sm: 320 },
                mx: "auto",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                textAlign: "center",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
                {translate("Totalt live", "Total live players")}
              </Typography>
              {loadingLive ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                    {translate("Hämtar live-data…", "Fetching live data…")}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#34d399" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                      {totalLiveDisplayValue != null ? numberFormatter.format(totalLiveDisplayValue) : "—"}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                    {playersUpdatedText}
                  </Typography>
                  {hourlyComparisonMeta ? (
                    <Typography variant="caption" sx={{ color: hourlyComparisonMeta.color }}>
                      {hourlyComparisonMeta.text}
                    </Typography>
                  ) : null}
                  {stuckLiveGamesCount > 0 ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#fbbf24",
                        border: "1px solid rgba(251,191,36,0.35)",
                        backgroundColor: "rgba(120,53,15,0.2)",
                        borderRadius: "8px",
                        px: 1,
                        py: 0.4,
                        fontWeight: 600,
                      }}
                    >
                      {translate(
                        `${stuckLiveGamesCount} spel döljs som stuck tills de uppdateras.`,
                        `${stuckLiveGamesCount} games are hidden as stuck until they update.`
                      )}
                    </Typography>
                  ) : null}
                  {lobbyBoostOn && (
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
                      {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                    </Typography>
                  )}
                  <Chip
                    size="small"
                    label={lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")}
                    onClick={onToggleLobbyBoost}
                    clickable
                    sx={{
                      borderRadius: "999px",
                      mt: 0.5,
                      alignSelf: "center",
                      backgroundColor: lobbyBoostOn ? "rgba(52,211,153,0.18)" : "rgba(15,23,42,0.6)",
                      color: lobbyBoostOn ? "#34d399" : "rgba(248,250,252,0.85)",
                      border: lobbyBoostOn ? "1px solid rgba(52,211,153,0.45)" : "1px solid rgba(148,163,184,0.35)",
                      fontWeight: 600,
                    }}
                  />
                </>
              )}
            </Box>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(251,113,133,0.25)",
                p: { xs: 2, md: 2.5 },
                width: { xs: "100%", sm: 320 },
                mx: "auto",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: "rgba(251,113,133,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
              >
                {translate("Dagens lobby-peak", "Today's lobby peak")}
              </Typography>
              {overviewLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#fb7185" }} />
                  <Typography variant="body2" sx={{ color: "rgba(251,113,133,0.8)" }}>
                    {translate("Analyserar mätpunkter…", "Analysing datapoints…")}
                  </Typography>
                </Box>
              ) : todayPeakDisplayValue != null ? (
                <>
                  <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fb7185" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {numberFormatter.format(todayPeakDisplayValue)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                    {todayPeakMetaText}
                  </Typography>
                  {lobbyBoostOn && (
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                      {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                    </Typography>
                  )}
                  <Chip
                    size="small"
                    label={lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")}
                    onClick={onToggleLobbyBoost}
                    clickable
                    sx={{
                      borderRadius: "999px",
                      mt: 0.5,
                      alignSelf: "center",
                      backgroundColor: lobbyBoostOn ? "rgba(251,113,133,0.18)" : "rgba(15,23,42,0.6)",
                      color: lobbyBoostOn ? "#fb7185" : "rgba(248,250,252,0.85)",
                      border: lobbyBoostOn ? "1px solid rgba(251,113,133,0.4)" : "1px solid rgba(148,163,184,0.35)",
                      fontWeight: 600,
                    }}
                  />
                </>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                  {translate("Inga datapunkter registrerade för idag ännu.", "No datapoints registered yet today.")}
                </Typography>
              )}
            </Box>
          </Box>

          {showYesterdayPeakCard && (
            <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
              <Box
                sx={{
                  background: "rgba(15,23,42,0.45)",
                  borderRadius: "16px",
                  border: "1px solid rgba(251,191,36,0.25)",
                  p: { xs: 2, md: 2.5 },
                  width: { xs: "100%", sm: 320 },
                  mx: "auto",
                  minHeight: 180,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: "rgba(251,191,36,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                >
                  {translate("Gårdagens peak", "Yesterday's peak")}
                </Typography>
                {overviewLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    <CircularProgress size={18} sx={{ color: "#fbbf24" }} />
                    <Typography variant="body2" sx={{ color: "rgba(251,191,36,0.85)" }}>
                      {translate("Hämtar gårdagens mätning…", "Fetching yesterday's measurement…")}
                    </Typography>
                  </Box>
                ) : yesterdayPeakDisplayValue != null ? (
                  <>
                    <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fbbf24" }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {numberFormatter.format(yesterdayPeakDisplayValue)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                      {yesterdayPeakMetaText}
                    </Typography>
                    {lobbyBoostOn && (
                      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                        {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                      </Typography>
                    )}
                    <Chip
                      size="small"
                      label={lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")}
                      onClick={onToggleLobbyBoost}
                      clickable
                      sx={{
                        borderRadius: "999px",
                        mt: 0.5,
                        alignSelf: "center",
                        backgroundColor: lobbyBoostOn ? "rgba(251,191,36,0.18)" : "rgba(15,23,42,0.6)",
                        color: lobbyBoostOn ? "#fbbf24" : "rgba(248,250,252,0.85)",
                        border: lobbyBoostOn ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(148,163,184,0.35)",
                        fontWeight: 600,
                      }}
                    />
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                    {translate("Ingen peak registrerad för gårdagen.", "No peak recorded for yesterday.")}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(96,165,250,0.25)",
                p: { xs: 2, md: 2.5 },
                width: { xs: "100%", sm: 320 },
                mx: "auto",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: "rgba(191,219,254,0.95)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
              >
                {translate("Lobbyns ATH", "Lobby ATH")}
              </Typography>
              {overviewLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#93c5fd" }} />
                  <Typography variant="body2" sx={{ color: "rgba(191,219,254,0.85)" }}>
                    {translate("Hämtar historik…", "Fetching history…")}
                  </Typography>
                </Box>
              ) : lobbyAthDisplay ? (
                <>
                  <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#93c5fd" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {numberFormatter.format(lobbyAthDisplay.value)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                    {lobbyAthDisplay.isToday
                      ? lobbyAthDisplay.dateLabel
                        ? translate(`Ny topp idag (${lobbyAthDisplay.dateLabel})`, `New high today (${lobbyAthDisplay.dateLabel})`)
                        : translate("Ny topp idag", "New high today")
                      : lobbyAthDisplay.dateLabel
                      ? translate(`Uppnåddes ${lobbyAthDisplay.dateLabel}`, `Reached ${lobbyAthDisplay.dateLabel}`)
                      : translate("Datum okänt", "Date unknown")}
                  </Typography>
                  {lobbyBoostOn && (
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                      {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                    </Typography>
                  )}
                  <Chip
                    size="small"
                    label={lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")}
                    onClick={onToggleLobbyBoost}
                    clickable
                    sx={{
                      borderRadius: "999px",
                      mt: 0.5,
                      alignSelf: "center",
                      backgroundColor: lobbyBoostOn ? "rgba(96,165,250,0.18)" : "rgba(15,23,42,0.6)",
                      color: lobbyBoostOn ? "#93c5fd" : "rgba(248,250,252,0.85)",
                      border: lobbyBoostOn ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(148,163,184,0.35)",
                      fontWeight: 600,
                    }}
                  />
                </>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                  {translate("Ingen ATH-data kunde beräknas.", "No ATH data could be calculated.")}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(34,197,94,0.28)",
                p: { xs: 2, md: 2.5 },
                width: { xs: "100%", sm: 320 },
                mx: "auto",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: "rgba(134,239,172,0.95)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
              >
                {translate(
                  topGrowthUseMa
                    ? `Störst tillväxt (${topGrowthDays} dagar, MA)`
                    : `Störst tillväxt (${topGrowthDays} dagar)`,
                  topGrowthUseMa
                    ? `Top growth (${topGrowthDays} days, MA)`
                    : `Top growth (${topGrowthDays} days)`
                )}
              </Typography>
              {overviewLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#86efac" }} />
                  <Typography variant="body2" sx={{ color: "rgba(134,239,172,0.85)" }}>
                    {translate("Hämtar trenddata…", "Fetching trend data…")}
                  </Typography>
                </Box>
              ) : topGrowthDisplay ? (
                topGrowthDisplay.hasPositive ? (
                  <>
                    <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: topGrowthDisplay.color }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, textAlign: "center" }}>
                        {topGrowthDisplay.label}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "#86efac", textAlign: "center" }}>
                      {topGrowthDisplay.percentText}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                      {translate(`Senaste ${topGrowthDays} dagar`, `Last ${topGrowthDays} days`)}
                      {topGrowthUseMa ? translate(` • glidande snitt ${topGrowthDays}d`, ` • moving avg ${topGrowthDays}d`) : ""}
                      {topGrowthDisplay.rangeText ? ` • ${topGrowthDisplay.rangeText}` : ""}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                    {translate(
                      `Ingen positiv tillväxt senaste ${topGrowthDays} dagarna.`,
                      `No positive growth in the last ${topGrowthDays} days.`
                    )}
                    {topGrowthUseMa ? translate(" (glidande snitt)", " (moving avg)") : ""}
                  </Typography>
                )
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                  {translate("Ingen trenddata tillgänglig.", "No trend data available.")}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {hourlyByHourRows.length ? (
        <Box
          sx={{
            width: "100%",
            background: "rgba(15,23,42,0.45)",
            borderRadius: "16px",
            border: "1px solid rgba(148,163,184,0.18)",
            p: { xs: 2, md: 2.5 },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.9)", letterSpacing: 1.2, fontWeight: 600 }}>
              {translate("Timsnitt (lokal) vs live nu", "Hourly baseline (local) vs live now")}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.68)" }}>
              {translate("Visar 00–23 mot nuvarande live-total", "Shows 00–23 versus current live total")}
            </Typography>
          </Stack>
          <Grid container spacing={1.2}>
            {hourlyByHourRows.map((row) => {
              const deltaText =
                Number.isFinite(row.delta) ? `${row.delta > 0 ? "+" : ""}${percentFormatter.format(row.delta)}%` : "—";
              const deltaColor =
                Number.isFinite(row.delta) && row.delta > 0
                  ? "#86efac"
                  : Number.isFinite(row.delta) && row.delta < 0
                  ? "#fca5a5"
                  : "rgba(226,232,240,0.8)";
              return (
                <Grid key={`hourly-${row.hour}`} item xs={12} sm={6} md={4} lg={3}>
                  <Box
                    sx={{
                      borderRadius: "12px",
                      border: row.isCurrentHour
                        ? "1px solid rgba(56,189,248,0.55)"
                        : "1px solid rgba(148,163,184,0.25)",
                      background: row.isCurrentHour ? "rgba(56,189,248,0.08)" : "rgba(2,6,23,0.34)",
                      p: 1.2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.4,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.95)", fontWeight: 700 }}>
                      {row.hour}:00
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                      {translate("Snitt", "Avg")}: {numberFormatter.format(row.baseline)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                      {translate("Live", "Live")}: {row.currentTotal != null ? numberFormatter.format(row.currentTotal) : "—"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: deltaColor, fontWeight: 600 }}>
                      {translate("Diff", "Delta")}: {deltaText}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
                      {translate("Samples", "Samples")}: {numberFormatter.format(row.samples)}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ) : null}
    </Stack>
  );
}
