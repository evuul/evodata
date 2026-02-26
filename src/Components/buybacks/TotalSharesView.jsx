"use client";
import React, { useId } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Stack,
} from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { useTranslate } from "@/context/LocaleContext";

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  textPrimary: "#f8fafc",
  textSecondary: "rgba(203,213,225,0.78)",
  accent: "#38bdf8",
  grid: "rgba(148,163,184,0.14)",
  tooltipBg: "rgba(15,23,42,0.92)",
};

const TotalSharesView = ({
  isMobile,
  totalSharesData,
  latestTotalShares,
  latestEvolutionShares = 0,
  buybackSinceStartSummary = null,
  chartTypeTotalShares,
  onChangeChartTypeTotalShares,
  yDomain,
  yTicks,
  formatYAxisTick,
}) => {
  const translate = useTranslate();
  const areaFillId = `totalSharesArea-${useId()}`;
  const data = totalSharesData || [];
  const tickFontSize = isMobile ? 12 : 14;
  const yTickWidth = isMobile ? 42 : 60;
  const xHeight = isMobile ? 40 : 40;
  const evolutionShares = Number.isFinite(latestEvolutionShares) ? latestEvolutionShares : 0;
  const adjustedShareCount = Math.max(latestTotalShares - evolutionShares, 0);
  const totalRepurchased = Number(buybackSinceStartSummary?.totalSharesRepurchased);
  const repurchasedPct = Number(buybackSinceStartSummary?.repurchasedPct);
  const startDateLabel = buybackSinceStartSummary?.startDate
    ? new Date(buybackSinceStartSummary.startDate).toLocaleDateString("sv-SE")
    : null;
  const formatCompactMobileTick = (value) => {
    if (!Number.isFinite(value)) return "–";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}M`;
    if (abs >= 1_000) return `${(value / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
    return value.toLocaleString("sv-SE");
  };
  const yTickFormatter = isMobile ? formatCompactMobileTick : formatYAxisTick;

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 1.2, md: 3 },
        py: { xs: 2.4, md: 3.2 },
        display: "flex",
        flexDirection: "column",
        gap: 2.4,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" },
        }}
      >
        {translate("Totala aktier", "Total shares")}
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.2, sm: 1.6 }}
        sx={{ flexWrap: "wrap" }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: { xs: "100%", sm: 220 },
            background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(15,118,110,0.2))",
            borderRadius: "16px",
            border: `1px solid rgba(56,189,248,0.35)`,
            px: 2.2,
            py: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
            {translate("Totalt antal aktier", "Total share count")}
          </Typography>
          <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
            {latestTotalShares.toLocaleString("sv-SE")}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            {translate("Senaste registrerade aktiestocken", "Latest registered share count")}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: { xs: "100%", sm: 220 },
            background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,185,129,0.18))",
            borderRadius: "16px",
            border: `1px solid rgba(34,197,94,0.32)`,
            px: 2.2,
            py: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
            {translate("Aktier exkl. EVO:s innehav", "Shares excl. EVO ownership")}
          </Typography>
          <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
            {adjustedShareCount.toLocaleString("sv-SE")}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            {translate(
              "Totalt antal aktier minus Evolutions egna innehav",
              "Total share count minus Evolution-held stock"
            )}
          </Typography>
        </Box>
      </Stack>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {translate("Totala aktier över tid", "Total shares over time")}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs
          value={chartTypeTotalShares}
          onChange={onChangeChartTypeTotalShares}
          textColor="inherit"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "rgba(15,23,42,0.45)",
            borderRadius: "999px",
            p: 0.5,
            minHeight: "unset",
            "& .MuiTabs-flexContainer": {
              gap: 0.8,
            },
            "& .MuiTab-root": {
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
              padding: { xs: "6px 12px", sm: "8px 18px" },
              color: "rgba(203,213,225,0.75)",
              textTransform: "none",
              borderRadius: "999px",
              minHeight: 36,
              fontWeight: 600,
            },
            "& .Mui-selected": {
              color: COLORS.textPrimary,
              backgroundColor: "rgba(56,189,248,0.25)",
            },
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={translate("Linje", "Line")} value="line" />
          <Tab label={translate("Stapel", "Bar")} value="bar" />
        </Tabs>
      </Box>

      <Box sx={{ width: "100%", mx: { xs: -0.6, md: 0 } }}>
      <ResponsiveContainer width="100%" height={isMobile ? 280 : 300}>
        {chartTypeTotalShares === "line" ? (
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: isMobile ? 6 : 20,
              bottom: isMobile ? 14 : 20,
              left: isMobile ? 2 : 0,
            }}
          >
            {/* Transparent accent gradient under linjen */}
            <defs>
              <linearGradient id={areaFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value={translate("År", "Years")}
                  offset={-10}
                  position="insideBottom"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              domain={yDomain}
              tickFormatter={yTickFormatter}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value={translate("Antal aktier", "Number of shares")}
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: COLORS.tooltipBg,
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(8,15,40,0.38)",
              }}
            />
            <Area
              type="monotone"
              dataKey="totalShares"
              fill={`url(#${areaFillId})`}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="totalShares"
              stroke={COLORS.accent}
              strokeWidth={2.4}
              dot={{ r: 3.6, fill: COLORS.accent }}
              activeDot={{ r: 6, stroke: COLORS.surface, strokeWidth: 2 }}
            />
          </ComposedChart>
        ) : (
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: isMobile ? 6 : 20,
              bottom: isMobile ? 14 : 20,
              left: isMobile ? 2 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value={translate("År", "Years")}
                  offset={-10}
                  position="insideBottom"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              domain={yDomain}
              tickFormatter={yTickFormatter}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value={translate("Antal aktier", "Number of shares")}
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: COLORS.tooltipBg,
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(8,15,40,0.38)",
              }}
            />
            <Bar
              dataKey="totalShares"
              fill={COLORS.accent}
              name={translate("Antal aktier", "Number of shares")}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
      </Box>
      {Number.isFinite(totalRepurchased) && totalRepurchased > 0 ? (
        <Typography
          variant="body2"
          sx={{
            mt: -0.8,
            color: COLORS.textSecondary,
            textAlign: "center",
          }}
        >
          {translate(
            `Sedan återköpsstart${startDateLabel ? ` (${startDateLabel})` : ""}: ${Math.round(
              totalRepurchased
            ).toLocaleString("sv-SE")} återköpta aktier${
              Number.isFinite(repurchasedPct)
                ? ` (${repurchasedPct.toLocaleString("sv-SE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%)`
                : ""
            }.`,
            `Since buyback start${startDateLabel ? ` (${startDateLabel})` : ""}: ${Math.round(
              totalRepurchased
            ).toLocaleString("sv-SE")} shares repurchased${
              Number.isFinite(repurchasedPct)
                ? ` (${repurchasedPct.toLocaleString("sv-SE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%)`
                : ""
            }.`
          )}
        </Typography>
      ) : null}

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {translate("Historisk data", "Historical data")}
      </Typography>
      <TableContainer
        sx={{
          backgroundColor: "rgba(15,23,42,0.5)",
          borderRadius: "16px",
          border: `1px solid ${COLORS.border}`,
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}
      >
        <Table size="small" sx={{ minWidth: isMobile ? 600 : "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {translate("År", "Year")}
              </TableCell>
              <TableCell
                sx={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {translate("Totala aktier", "Total shares")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={item.date}
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(148,163,184,0.06)",
                  },
                }}
              >
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.date}
                </TableCell>
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.totalShares.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TotalSharesView;
