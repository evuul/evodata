"use client";

// Game trend card for the live players overview.

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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { formatDateOnly } from "@/lib/livePlayersControlPanel";

export default function LivePlayersControlPanelGameTrendView({
  overviewLoading,
  overviewError,
  options,
  selectedSlug,
  onSelectSlug,
  trendUpdatedLabel,
  chartData,
  summary,
  selectedOption,
  dayOptions,
  days,
  onChangeDays,
  movingAverageOn,
  onToggleMovingAverage,
  movingAverageDays,
  movingAverageOptions,
  onChangeMovingAverageDays,
  numberFormatter,
  translate,
  percentFormatter,
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
    summary && Number.isFinite(summary.absolute)
      ? summary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    summary && Number.isFinite(summary.percent)
      ? `${summary.percent > 0 ? "+" : ""}${percentFormatter.format(summary.percent)}%`
      : "—";
  const absoluteText = summary && Number.isFinite(summary.absolute) ? formatSigned(summary.absolute) : "—";
  const startText = summary?.start?.value != null ? numberFormatter.format(summary.start.value) : "—";
  const endText = summary?.end?.value != null ? numberFormatter.format(summary.end.value) : "—";
  const startDateText = formatDateOnly(summary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(summary?.end?.date) ?? "—";
  const activeColor = selectedOption?.color ?? "#38bdf8";
  const activeLabel = selectedOption?.label ?? translate("Välj spel", "Select game");
  const movingAverageLabel = translate(`Glidande snitt ${movingAverageDays}d`, `Moving avg ${movingAverageDays}d`);
  const tooltipLabel = movingAverageOn ? movingAverageLabel : translate("Snitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const gameTrendTicks = useMemo(() => {
    if (!Array.isArray(chartData) || !chartData.length) return undefined;
    if (chartData.length <= maxXTicks) return chartData.map((row) => row.date);
    const step = Math.ceil((chartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < chartData.length; index += step) {
      ticks.push(chartData[index].date);
    }
    const lastDate = chartData[chartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [chartData, maxXTicks]);

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
      <Stack spacing={0.4}>
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
          {translate("Speltrend – dagligt snitt", "Game trend – daily average")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Hämtar speltrend…", "Fetching game trend…")
            : trendUpdatedLabel
            ? translate(`Senast uppdaterad ${trendUpdatedLabel}`, `Last updated ${trendUpdatedLabel}`)
            : overviewError || translate("Ingen speltrenddata", "No game trend data")}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
          {translate("Välj spel att analysera", "Select a game to analyse")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            maxHeight: { xs: 210, md: 120 },
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          {options.length ? (
            options.map((option) => {
              const isActive = option.slug === selectedSlug;
              return (
                <Chip
                  key={option.slug}
                  label={option.label}
                  onClick={() => onSelectSlug && onSelectSlug(option.slug)}
                  clickable
                  sx={{
                    borderRadius: "999px",
                    backgroundColor: isActive ? `${option.color}33` : "rgba(148,163,184,0.1)",
                    color: isActive ? option.color : "rgba(226,232,240,0.8)",
                    border: `1px solid ${isActive ? option.color : "transparent"}`,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              );
            })
          ) : (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
              {translate("Ingen speldata tillgänglig ännu.", "No game data available yet.")}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 0.75, md: 2 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="center"
        sx={{ color: "rgba(148,163,184,0.75)", textAlign: { xs: "left", md: "center" } }}
      >
        <Typography variant="caption">
          {translate("Start", "Start")}: <strong>{startText}</strong> ({startDateText})
        </Typography>
        <Typography variant="caption">
          {translate("Slut", "End")}: <strong>{endText}</strong> ({endDateText})
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
      >
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
          {translate("Visa dagar", "Show days")}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
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
          {movingAverageOn && (
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
          )}
          <ToggleButtonGroup
            value={days}
            exclusive
            size="small"
            onChange={(_, value) => value && onChangeDays(value)}
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
                    backgroundColor: "rgba(74,222,128,0.28)",
                  },
                }}
              >
                {option} d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {selectedSlug && (
        <Stack spacing={0.4} alignItems="center" sx={{ mt: 0.5, textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: activeColor, fontWeight: 700, textAlign: "center" }}>
            {activeLabel}
          </Typography>
          {summary && (
            <Typography variant="subtitle2" sx={{ color: changeColor, fontWeight: 600 }}>
              {translate("Förändring", "Change")}: {absoluteText} ({percentText})
              {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
            </Typography>
          )}
        </Stack>
      )}

      <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
        {overviewLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
            <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Laddar spelardata…
            </Typography>
          </Box>
        ) : chartData.length ? (
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              barCategoryGap={isMobile ? "18%" : "22%"}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                ticks={gameTrendTicks}
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
                tickFormatter={formatPlayersAxis}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                width={isMobile ? 40 : 60}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value) => [`${numberFormatter.format(value)} ${translate("spelare", "players")}`, tooltipLabel]}
              />
              <Bar dataKey="players" fill={activeColor} radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 20 : 28} />
            </BarChart>
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
            {translate("Ingen trenddata för valt spel.", "No trend data for the selected game.")}
          </Box>
        )}
      </Box>
    </Box>
  );
}
