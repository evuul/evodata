"use client";

// Presents the primary live lobby overview cards.

import React from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { mobileAccentFrameSx } from "@/lib/liveDashboardPresentation";

const overviewCardSx = (frameColor) => ({
  ...mobileAccentFrameSx(frameColor),
  background: "rgba(15,23,42,0.45)",
  borderRadius: "16px",
  boxSizing: "border-box",
  p: { xs: 2, md: 2.5 },
  width: { xs: "100%", sm: 320 },
  mx: "auto",
  minHeight: 180,
  display: "flex",
  flexDirection: "column",
  gap: 1,
});

export default function LivePlayersControlPanelOverviewSection({
  translate,
  numberFormatter,
  loadingLive,
  totalLiveDisplayValue,
  playersUpdatedText,
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
  stuckLiveGamesCount,
}) {
  const todayPeakLoading = overviewLoading && todayPeakDisplayValue == null;
  const yesterdayPeakLoading = overviewLoading && yesterdayPeakDisplayValue == null;
  const lobbyAthLoading = overviewLoading && !lobbyAthDisplay;
  const topGrowthLoading = overviewLoading && !topGrowthDisplay;

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
                ...overviewCardSx("rgba(52,211,153,0.55)"),
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
                </>
              )}
            </Box>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
            <Box
              sx={overviewCardSx("rgba(251,113,133,0.42)")}
            >
              <Typography
                variant="overline"
                sx={{ color: "rgba(251,113,133,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
              >
                {translate("Dagens lobby-peak", "Today's lobby peak")}
              </Typography>
              {todayPeakLoading ? (
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
                sx={overviewCardSx("rgba(251,191,36,0.42)")}
              >
                <Typography
                  variant="overline"
                  sx={{ color: "rgba(251,191,36,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                >
                  {translate("Gårdagens peak", "Yesterday's peak")}
                </Typography>
                {yesterdayPeakLoading ? (
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
              sx={overviewCardSx("rgba(96,165,250,0.42)")}
            >
              <Typography
                variant="overline"
                sx={{ color: "rgba(191,219,254,0.95)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
              >
                {translate("Lobbyns ATH", "Lobby ATH")}
              </Typography>
              {lobbyAthLoading ? (
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
              sx={overviewCardSx("rgba(34,197,94,0.44)")}
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
              {topGrowthLoading ? (
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

    </Stack>
  );
}
