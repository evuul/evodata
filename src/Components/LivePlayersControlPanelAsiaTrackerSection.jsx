"use client";

// Asia tracker section for the live players overview.

import React, { useCallback, useMemo } from "react";
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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
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

export default function LivePlayersControlPanelAsiaTrackerSection({
  overviewLoading,
  overviewError,
  lastUpdatedLabel,
  totalLive,
  liveShare,
  tableRows,
  options,
  selectedSlug,
  onSelectSlug,
  viewMode,
  onChangeViewMode,
  trendChartData,
  trendSummary,
  gameChartData,
  gameSummary,
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
  const isTrendView = viewMode === "trend";
  const currentSummary = isTrendView ? trendSummary : gameSummary;
  const formatSigned = (value) => {
    if (!Number.isFinite(value)) return "—";
    const abs = numberFormatter.format(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  };

  const changeColor =
    currentSummary && Number.isFinite(currentSummary?.absolute)
      ? currentSummary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    currentSummary && Number.isFinite(currentSummary?.percent)
      ? `${currentSummary.percent > 0 ? "+" : ""}${percentFormatter.format(currentSummary.percent)}%`
      : "—";
  const absoluteText =
    currentSummary && Number.isFinite(currentSummary?.absolute) ? formatSigned(currentSummary.absolute) : "—";
  const startText =
    currentSummary?.start?.value != null ? numberFormatter.format(currentSummary.start.value) : "—";
  const endText =
    currentSummary?.end?.value != null ? numberFormatter.format(currentSummary.end.value) : "—";
  const startDateText = formatDateOnly(currentSummary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(currentSummary?.end?.date) ?? "—";

  const activeColor = selectedOption?.color ?? "#fde047";
  const activeLabel = selectedOption?.label ?? translate("Välj Asien-spel", "Select Asia game");
  const totalLiveText = Number.isFinite(totalLive) ? numberFormatter.format(totalLive) : "—";
  const shareText =
    Number.isFinite(liveShare) && liveShare != null ? `${percentFormatter.format(liveShare * 100)}%` : "—";
  const movingAverageLabel = translate(`Glidande snitt ${movingAverageDays}d`, `Moving avg ${movingAverageDays}d`);
  const tooltipLabel = movingAverageOn ? movingAverageLabel : translate("Snitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const asiaTrendTicks = useMemo(() => {
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

  const asiaGameTicks = useMemo(() => {
    if (!Array.isArray(gameChartData) || !gameChartData.length) return undefined;
    if (gameChartData.length <= maxXTicks) return gameChartData.map((row) => row.date);
    const step = Math.ceil((gameChartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < gameChartData.length; index += step) {
      ticks.push(gameChartData[index].date);
    }
    const lastDate = gameChartData[gameChartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [gameChartData, maxXTicks]);

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
        gap: 1.75,
      }}
    >
      <Stack spacing={0.4} alignItems="center" sx={{ textAlign: "center" }}>
        <Typography
          variant="overline"
          sx={{ color: "rgba(248,250,133,0.9)", letterSpacing: 1.4, fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
        >
          {translate("Asia Tracker", "Asia Tracker")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Hämtar Asien-data…", "Fetching Asia data…")
            : lastUpdatedLabel
            ? translate(`Senast uppdaterad ${lastUpdatedLabel}`, `Last updated ${lastUpdatedLabel}`)
            : overviewError || translate("Ingen data för Asien-spel ännu", "No data for Asia games yet")}
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems="center"
        justifyContent="center"
        sx={{ textAlign: "center" }}
      >
        <Chip
          label={translate(`Live just nu: ${totalLiveText}`, `Live right now: ${totalLiveText}`)}
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(248,250,133,0.18)",
            color: "#fde68a",
            fontWeight: 600,
          }}
        />
        <Chip
          label={translate(`Andel av livevolym: ${shareText}`, `Share of live volume: ${shareText}`)}
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(74,222,128,0.15)",
            color: "#4ade80",
            fontWeight: 600,
          }}
        />
      </Stack>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        size="small"
        onChange={(_, value) => value && onChangeViewMode(value)}
        sx={{
          alignSelf: "center",
          backgroundColor: "rgba(148,163,184,0.12)",
          borderRadius: "999px",
          p: 0.5,
        }}
      >
        <ToggleButton
          value="trend"
          sx={{
            textTransform: "none",
            color: "rgba(226,232,240,0.75)",
            border: 0,
            borderRadius: "999px!important",
            px: { xs: 1.5, md: 2.2 },
            "&.Mui-selected": {
              color: "#f8fafc",
              backgroundColor: "rgba(248,250,133,0.28)",
            },
          }}
        >
          {translate("Asien-trend", "Asia trend")}
        </ToggleButton>
        <ToggleButton
          value="games"
          sx={{
            textTransform: "none",
            color: "rgba(226,232,240,0.75)",
            border: 0,
            borderRadius: "999px!important",
            px: { xs: 1.5, md: 2.2 },
            "&.Mui-selected": {
              color: "#f8fafc",
              backgroundColor: "rgba(56,189,248,0.28)",
            },
          }}
        >
          {translate("Spel", "Games")}
        </ToggleButton>
      </ToggleButtonGroup>

      {!isTrendView ? (
        <Stack spacing={1} alignItems="center" sx={{ textAlign: "center" }}>
          <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
            {translate("Välj Asien-spel", "Select Asia game")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              maxHeight: { xs: 210, md: 120 },
              overflowY: "auto",
              pr: 0.5,
              justifyContent: "center",
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
                {translate("Ingen speldata för Asien-portföljen ännu.", "No game data for the Asia portfolio yet.")}
              </Typography>
            )}
          </Box>
        </Stack>
      ) : null}

      {!isTrendView && selectedSlug ? (
        <Stack spacing={0.4} alignItems="center" sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: activeColor, fontWeight: 700 }}>
            {activeLabel}
          </Typography>
          {gameSummary ? (
            <Typography variant="subtitle2" sx={{ color: changeColor, fontWeight: 600 }}>
              {translate("Förändring", "Change")}: {absoluteText} ({percentText})
              {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

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
        {(isTrendView || !selectedSlug) ? (
          <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600 }}>
            {translate("Förändring", "Change")}: {absoluteText} ({percentText})
            {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
          </Typography>
        ) : null}
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
                    backgroundColor: isTrendView ? "rgba(248,250,133,0.28)" : "rgba(56,189,248,0.28)",
                  },
                }}
              >
                {option} d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
        {overviewLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
            <CircularProgress size={20} sx={{ color: isTrendView ? "#fde68a" : "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Laddar spelardata…", "Loading player data…")}
            </Typography>
          </Box>
        ) : isTrendView ? (
          trendChartData.length ? (
            <ResponsiveContainer>
              <AreaChart
                data={trendChartData}
                margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="asiaTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fde047" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#fde047" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  ticks={asiaTrendTicks}
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
                  tickFormatter={formatPlayersAxis}
                  width={isMobile ? 40 : 60}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(250, 204, 21, 0.25)",
                    borderRadius: 12,
                    color: "#f8fafc",
                  }}
                  formatter={(value) => [`${numberFormatter.format(value)} ${translate("spelare", "players")}`, tooltipLabel]}
                />
                <Area
                  dataKey="players"
                  type="monotone"
                  stroke="#fde047"
                  strokeWidth={isMobile ? 2 : 2.2}
                  fill="url(#asiaTrendGradient)"
                  fillOpacity={1}
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
              {translate("Ingen sammanlagd trenddata för Asien-portföljen.", "No aggregated trend data for the Asia portfolio.")}
            </Box>
          )
        ) : gameChartData.length ? (
          <ResponsiveContainer>
            <BarChart
              data={gameChartData}
              margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              barCategoryGap={isMobile ? "18%" : "22%"}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                ticks={asiaGameTicks}
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
                  border: "1px solid rgba(250, 204, 21, 0.25)",
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

      <Divider sx={{ borderColor: "rgba(148,163,184,0.15)" }} />

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
          {translate("Nyckeltal per spel", "Key metrics per game")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
          {translate(
            "Live just nu vs snitt spelare (30–90 d) för utvalda Asien-spel.",
            "Live right now vs average players (30–90 d) for selected Asia games."
          )}
        </Typography>
        <Stack spacing={1}>
          {tableRows.length ? (
            tableRows.map((row) => (
              <Box
                key={row.slug}
                sx={{
                  background: "rgba(15,23,42,0.55)",
                  borderRadius: "12px",
                  border: `1px solid ${row.color}44`,
                  p: 1.25,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
                    <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>{row.label}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                        {translate("Live", "Live")}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
                        {row.livePlayers != null ? numberFormatter.format(row.livePlayers) : "—"}
                      </Typography>
                    </Stack>
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                        {translate("Snitt", "Average")}
                      </Typography>
                      <Typography sx={{ color: "#fde68a", fontWeight: 600 }}>
                        {row.avgPlayers != null ? numberFormatter.format(row.avgPlayers) : "—"}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            ))
          ) : (
            <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
              {translate("Ingen översikt tillgänglig för dessa spel ännu.", "No overview available for these games yet.")}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
