"use client";

// Presents a premium year-over-year comparison of monthly lobby activity.

import React, { useCallback, useMemo } from "react";
import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { findLatestMonthlyComparison } from "@/lib/monthlyLobbyActivity";

const YEAR_COLORS = ["#38bdf8", "#a78bfa"];

export default function LivePlayersControlPanelMonthlyActivitySection({
  overviewLoading,
  overviewError,
  chartData,
  years,
  trendUpdatedLabel,
  hasExtendedAccess,
  numberFormatter,
  translate,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const activeYears = Array.isArray(years) ? years.map(String) : [];
  const monthLabelKey = translate("monthSv", "monthEn");
  const latestComparison = useMemo(
    () => findLatestMonthlyComparison(chartData, activeYears),
    [activeYears, chartData]
  );
  const hasChartData =
    activeYears.length === 2 &&
    chartData.some((row) => activeYears.some((year) => Number.isFinite(row?.[year])));

  const formatAxis = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      return Math.abs(value) >= 1_000 ? `${Math.round(value / 1_000)}k` : numberFormatter.format(value);
    },
    [numberFormatter]
  );

  const lockedContent = (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.1}
      sx={{ minHeight: { xs: 250, md: 320 }, textAlign: "center", px: { xs: 1, md: 6 } }}
    >
      <Box sx={{ p: 1.2, borderRadius: "50%", backgroundColor: "rgba(245,158,11,0.14)", border: "1px solid rgba(253,230,138,0.3)" }}>
        <LockRounded sx={{ color: "#fde68a", fontSize: 26 }} />
      </Box>
      <Typography sx={{ color: "#f8fafc", fontWeight: 800 }}>
        {translate("Jämför samma månad mellan år", "Compare the same month across years")}
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.68)", maxWidth: 540, lineHeight: 1.6 }}>
        {translate(
          "Månadsjämförelsen använder upp till två års lobbyhistorik och ingår för Founders och Premium.",
          "The monthly comparison uses up to two years of lobby history and is included for Founders and Premium."
        )}
      </Typography>
      <Chip
        icon={<LockRounded sx={{ "&.MuiChip-icon": { color: "#fde68a" } }} />}
        label={translate("Founder / Premium", "Founder / Premium")}
        sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", fontWeight: 700 }}
      />
    </Stack>
  );

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(56,189,248,0.24)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
        <Stack spacing={0.35}>
          <Typography variant="overline" sx={{ color: "#7dd3fc", letterSpacing: 1.2, fontWeight: 700 }}>
            {translate("Månadsvis aktivitet · år mot år", "Monthly activity · year over year")}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.68)" }}>
            {translate(
              "Samma kalendermånad visas sida vid sida. 2025 visas från november på grund av ändrad datatäckning.",
              "The same calendar month is shown side by side. 2025 starts in November because tracking coverage changed."
            )}
          </Typography>
        </Stack>
        {hasExtendedAccess && activeYears.length ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "wrap" }}>
            {activeYears.map((year, index) => (
              <Chip
                key={year}
                label={year}
                size="small"
                sx={{ color: YEAR_COLORS[index], backgroundColor: `${YEAR_COLORS[index]}18`, border: `1px solid ${YEAR_COLORS[index]}55`, fontWeight: 800 }}
              />
            ))}
            {trendUpdatedLabel ? (
              <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                {translate(`Uppdaterad ${trendUpdatedLabel}`, `Updated ${trendUpdatedLabel}`)}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      {!hasExtendedAccess ? lockedContent : overviewLoading ? (
        <Box sx={{ minHeight: { xs: 250, md: 320 }, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            {translate("Laddar månadsjämförelse…", "Loading monthly comparison…")}
          </Typography>
        </Box>
      ) : hasChartData ? (
        <>
          {latestComparison ? (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 0.8,
                px: 1.15,
                py: 0.75,
                borderRadius: "10px",
                backgroundColor: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.18)",
              }}
            >
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.78)", fontWeight: 700 }}>
                {translate("Senaste jämförbara månad", "Latest comparable month")}: {latestComparison[monthLabelKey]} {latestComparison.previousYear} → {latestComparison[monthLabelKey]} {latestComparison.currentYear}
              </Typography>
              <Typography variant="caption" sx={{ color: latestComparison.changePct >= 0 ? "#34d399" : "#f87171", fontWeight: 800 }}>
                {latestComparison.changePct >= 0 ? "+" : ""}{latestComparison.changePct.toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                {numberFormatter.format(latestComparison[latestComparison.previousYear])} → {numberFormatter.format(latestComparison[latestComparison.currentYear])} {translate("spelare", "players")}
              </Typography>
            </Box>
          ) : null}
          <Box sx={{ height: { xs: 280, md: 340 }, mx: { xs: -1, md: 0 } }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 12, right: 16, left: -10, bottom: 0 }} barCategoryGap={isMobile ? "20%" : "26%"} barGap={isMobile ? 2 : 4}>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey={monthLabelKey} tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.25)" }} />
                <YAxis width={isMobile ? 40 : 58} tickFormatter={formatAxis} tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.25)" }} />
                <RechartsTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.96)", border: "1px solid rgba(96,165,250,0.32)", borderRadius: 12, color: "#f8fafc" }}
                  labelFormatter={(label) => translate(`${label}`, `${label}`)}
                  formatter={(value, name, item) => {
                    const days = item?.payload?.[`${name}Days`] ?? 0;
                    return [`${numberFormatter.format(value)} ${translate("spelare", "players")} · ${days} ${translate("dagar", "days")}`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: "rgba(226,232,240,0.82)", paddingTop: 8 }} />
                {activeYears.map((year, index) => (
                  <Bar key={year} dataKey={year} name={year} fill={YEAR_COLORS[index]} radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 18 : 30} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </>
      ) : (
        <Box sx={{ minHeight: { xs: 250, md: 320 }, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "rgba(148,163,184,0.75)", px: 2 }}>
          {overviewError || translate("Det finns ännu inte tillräckligt med historik för en årsjämförelse.", "There is not yet enough history for a year-over-year comparison.")}
        </Box>
      )}
    </Box>
  );
}
