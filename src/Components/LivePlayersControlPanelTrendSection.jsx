"use client";

// Trend chart card for live players overview.

import React, { useCallback, useMemo } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";

const formatDateOnly = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return null;
  }
};

export default function LivePlayersControlPanelTrendSection({
  overviewLoading,
  overviewError,
  trendChartData,
  trendSummary,
  trendDays,
  trendUpdatedLabel,
  onChangeDays,
  boostOn,
  onToggleBoost,
  movingAverageOn,
  onToggleMovingAverage,
  movingAverageDays,
  movingAverageOptions,
  onChangeMovingAverageDays,
  numberFormatter,
  translate,
  percentFormatter,
  dayOptions,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const formatSigned = (value) => {
    if (!Number.isFinite(value)) return "—";
    const abs = numberFormatter.format(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  };

  const changeColor =
    trendSummary && Number.isFinite(trendSummary.absolute)
      ? trendSummary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    trendSummary && Number.isFinite(trendSummary.percent)
      ? `${trendSummary.percent > 0 ? "+" : ""}${percentFormatter.format(trendSummary.percent)}%`
      : "—";
  const absoluteText =
    trendSummary && Number.isFinite(trendSummary.absolute) ? formatSigned(trendSummary.absolute) : "—";
  const startText =
    trendSummary?.start?.value != null ? numberFormatter.format(trendSummary.start.value) : "—";
  const endText =
    trendSummary?.end?.value != null ? numberFormatter.format(trendSummary.end.value) : "—";
  const startDateText = formatDateOnly(trendSummary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(trendSummary?.end?.date) ?? "—";
  const movingAverageLabel = translate(`Glidande snitt ${movingAverageDays}d`, `Moving avg ${movingAverageDays}d`);
  const tooltipLabel = movingAverageOn ? movingAverageLabel : translate("Genomsnitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const xAxisTicks = useMemo(() => {
    if (!Array.isArray(trendChartData) || !trendChartData.length) return undefined;
    if (trendChartData.length <= maxXTicks) return trendChartData.map((row) => row.date);
    const step = Math.ceil((trendChartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < trendChartData.length; index += step) {
      ticks.push(trendChartData[index].date);
    }
    const lastDate = trendChartData[trendChartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [trendChartData, maxXTicks]);

  const formatAxisDate = useCallback(
    (value) => {
      if (!value) return "";
      const text = String(value);
      return isMobile ? text.slice(5) : text;
    },
    [isMobile]
  );

  const formatPlayersAxis = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      if (!isMobile) return numberFormatter.format(value);
      if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
      return numberFormatter.format(value);
    },
    [isMobile, numberFormatter]
  );

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
            {translate("Trend – genomsnittliga spelare", "Trend – average players")}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
            {overviewLoading
              ? translate("Hämtar trenddata…", "Fetching trend data…")
              : trendUpdatedLabel
              ? translate(`Senast uppdaterad ${trendUpdatedLabel}`, `Last updated ${trendUpdatedLabel}`)
              : overviewError || translate("Ingen trenddata", "No trend data")}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label={boostOn ? translate("Boost +10% (på)", "Boost +10% (on)") : translate("Boost +10%", "Boost +10%")}
            onClick={onToggleBoost}
            clickable
            sx={{
              borderRadius: "999px",
              backgroundColor: boostOn ? "rgba(74,222,128,0.22)" : "rgba(148,163,184,0.12)",
              color: boostOn ? "#34d399" : "rgba(226,232,240,0.85)",
              border: boostOn ? "1px solid rgba(74,222,128,0.55)" : "1px solid transparent",
              fontWeight: boostOn ? 700 : 500,
            }}
          />

          <Chip
            label={movingAverageOn ? `${movingAverageLabel} (${translate("på", "on")})` : movingAverageLabel}
            onClick={onToggleMovingAverage}
            clickable
            sx={{
              borderRadius: "999px",
              backgroundColor: movingAverageOn ? "rgba(56,189,248,0.2)" : "rgba(148,163,184,0.12)",
              color: movingAverageOn ? "#7dd3fc" : "rgba(226,232,240,0.85)",
              border: movingAverageOn ? "1px solid rgba(56,189,248,0.45)" : "1px solid transparent",
              fontWeight: movingAverageOn ? 700 : 500,
            }}
          />
          {movingAverageOn ? (
            <ToggleButtonGroup
              value={movingAverageDays}
              exclusive
              size="small"
              onChange={(_, value) => value && onChangeMovingAverageDays?.(value)}
              sx={{
                backgroundColor: "rgba(56,189,248,0.12)",
                borderRadius: "999px",
                p: 0.5,
              }}
            >
              {(movingAverageOptions || []).map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  sx={{
                    textTransform: "none",
                    color: "rgba(226,232,240,0.75)",
                    border: 0,
                    borderRadius: "999px!important",
                    px: { xs: 1.25, md: 1.75 },
                    "&.Mui-selected": {
                      color: "#f8fafc",
                      backgroundColor: "rgba(56,189,248,0.35)",
                    },
                  }}
                >
                  MA {option}d
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : null}

          <ToggleButtonGroup
            value={trendDays}
            exclusive
            onChange={(_, value) => value && onChangeDays(value)}
            size="small"
            sx={{
              backgroundColor: "rgba(148,163,184,0.12)",
              borderRadius: "999px",
              p: 0.5,
            }}
          >
            {(dayOptions || []).map((option) => (
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
                    backgroundColor: "rgba(56,189,248,0.28)",
                  },
                }}
              >
                {option} d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {boostOn ? (
        <Box
          sx={{
            background: "linear-gradient(90deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))",
            border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: "12px",
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 700 }}>
            {translate(
              "Simulerar EVOS riktiga lobby: +10% ökning på trenden (visas i graf & tooltip)",
              "Simulating EVOS real lobby: +10% boost applied to the trend (shown in chart & tooltip)"
            )}
          </Typography>
        </Box>
      ) : null}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 0.75, md: 2 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        sx={{ color: "rgba(148,163,184,0.75)" }}
      >
        <Typography variant="caption">
          {translate("Start", "Start")}: <strong>{startText}</strong> ({startDateText})
        </Typography>
        <Typography variant="caption">
          {translate("Slut", "End")}: <strong>{endText}</strong> ({endDateText})
        </Typography>
        <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600 }}>
          {translate("Förändring", "Change")}: {absoluteText} ({percentText}) {boostOn ? translate("• (boost +10%)", "• (boost +10%)") : ""}
          {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
        </Typography>
      </Stack>

      <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
        {overviewLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
            <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Laddar spelardata…", "Loading player data…")}
            </Typography>
          </Box>
        ) : Array.isArray(trendChartData) && trendChartData.length ? (
          <ResponsiveContainer>
            <AreaChart
              data={trendChartData}
              margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="liveTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                ticks={xAxisTicks}
                interval={0}
                tickFormatter={formatAxisDate}
                minTickGap={isMobile ? 26 : 18}
                tickMargin={8}
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                width={isMobile ? 40 : 60}
                tickFormatter={formatPlayersAxis}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value) => [
                  `${numberFormatter.format(value)} ${translate("spelare", "players")}${boostOn ? " (boost +10%)" : ""}`,
                  tooltipLabel,
                ]}
              />
              <Area
                type="monotone"
                dataKey="players"
                stroke="#38bdf8"
                strokeWidth={isMobile ? 2.2 : 2.5}
                fill="url(#liveTrendGradient)"
                fillOpacity={1}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(148,163,184,0.75)",
            }}
          >
            {translate("Ingen trenddata tillgänglig.", "No trend data available.")}
          </Box>
        )}
      </Box>
    </Box>
  );
}
