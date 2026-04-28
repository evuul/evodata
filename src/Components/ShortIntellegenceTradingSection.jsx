"use client";

// Trading-vy för short intelligence-dashboarden.

import { Box, Chip, Typography, Stack } from "@mui/material";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Bar,
  Line,
} from "recharts";
import { formatPercent, formatMillion } from "./useShortIntelligenceModel";

export default function ShortIntellegenceTradingSection({
  isMobile,
  translate,
  tradingRanges,
  tradingRange,
  setTradingRange,
  tradingError,
  tradingSeries,
  tradingAxisInterval,
  latestTradingSummary,
  aggregateShare,
  tradingTooltip,
}) {
  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.55)",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: { xs: 0, md: "16px" },
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, md: 3 },
        overflow: "visible",
      }}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {tradingRanges.map((value) => (
          <Chip
            key={value}
            label={`${value}D`}
            size="small"
            onClick={() => setTradingRange(value)}
            sx={{
              backgroundColor:
                tradingRange === value
                  ? "rgba(250,204,21,0.28)"
                  : "rgba(148,163,184,0.15)",
              color:
                tradingRange === value
                  ? "#f8fafc"
                  : "rgba(226,232,240,0.75)",
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>

      <Box sx={{ height: isMobile ? 280 : 320 }}>
        {tradingError ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f87171",
            }}
          >
            <Typography>{tradingError}</Typography>
          </Box>
        ) : tradingSeries.length ? (
          <Box
            sx={{
              width: {
                xs: "calc(100% + 32px)",
                sm: "calc(100% + 48px)",
                md: "100%",
              },
              mx: { xs: -2, sm: -3, md: 0 },
              height: "100%",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={tradingSeries}
                margin={{ top: 10, right: isMobile ? 4 : 0, left: 0, bottom: 8 }}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="xLabel"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: "rgba(148,163,184,0.75)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  interval={tradingAxisInterval}
                  minTickGap={isMobile ? 14 : 16}
                  height={isMobile ? 34 : 30}
                />
                <YAxis
                  yAxisId="left"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: "rgba(74,222,128,0.85)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(74,222,128,0.35)" }}
                  width={isMobile ? 40 : 56}
                  tickFormatter={(value) => {
                    if (!isMobile) return `${formatMillion(value, 0)}`;
                    if (!Number.isFinite(value)) return "–";
                    if (Math.abs(value) >= 1000) return `${formatMillion(value / 1000, 1)}B`;
                    return `${formatMillion(value, 0)}M`;
                  }}
                  label={{
                    value: translate("Miljoner aktier", "Million shares"),
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: "rgba(74,222,128,0.85)",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: "rgba(250,204,21,0.85)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(250,204,21,0.35)" }}
                  width={isMobile ? 40 : 56}
                  tickFormatter={(value) => (isMobile ? `${value.toFixed(0)}%` : `${value.toFixed(1)}%`)}
                />
                <RechartsTooltip content={tradingTooltip} />
                <Bar
                  yAxisId="left"
                  dataKey="volumeM"
                  fill="rgba(74,222,128,0.65)"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="shortSharePct"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="shortShareAvg5"
                  stroke="#a855f7"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(148,163,184,0.65)",
            }}
          >
            <Typography>
              {translate("Ingen handelsstatistik för vald period.", "No trading data for the selected period.")}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: { xs: 2, md: 3 },
          width: "100%",
        }}
      >
        <Box>
          <Box
            sx={{
              background: "rgba(250,204,21,0.12)",
              borderRadius: "14px",
              border: "1px solid rgba(250,204,21,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(250,204,21,0.9)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Senaste handelsdag", "Latest trading day")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {latestTradingSummary ? latestTradingSummary.shortPercent : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              {latestTradingSummary ? latestTradingSummary.date : "–"}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              background: "rgba(74,222,128,0.12)",
              borderRadius: "14px",
              border: "1px solid rgba(74,222,128,0.3)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(74,222,128,0.85)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Omsatt volym", "Volume traded")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {latestTradingSummary && latestTradingSummary.volumeM != null
                ? `${formatMillion(latestTradingSummary.volumeM, 1)} M aktier`
                : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              {translate(
                `Netto blankning: ${latestTradingSummary ? latestTradingSummary.netChange : "–"} aktier`,
                `Net shorting: ${latestTradingSummary ? latestTradingSummary.netChange : "–"} shares`
              )}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              background: "rgba(148,163,184,0.12)",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(148,163,184,0.75)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Periodsnitt blankarandel", "Average short share for period")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {aggregateShare != null ? formatPercent(aggregateShare, 1) : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              {translate("Andel av volym för vald period", "Share of volume for selected period")}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              background: "rgba(56,189,248,0.12)",
              borderRadius: "14px",
              border: "1px solid rgba(56,189,248,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(56,189,248,0.9)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Days to cover", "Days to cover")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {latestTradingSummary && latestTradingSummary.daysToCover != null
                ? latestTradingSummary.daysToCover.toFixed(2)
                : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              {translate("Kort/20d volymsnitt", "Shorts / 20d avg volume")}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
