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

const OwnershipView = ({
  isMobile,
  evolutionOwnershipData,
  ownershipPercentageData,
  latestEvolutionShares,
  latestOwnershipPercentage,
  cancelledShares,
  chartTypeOwnership,
  onChangeChartTypeOwnership,
  yDomain,
  yTicks,
  formatYAxisTick,
}) => {
  const translate = useTranslate();
  const areaFillId = `ownAreaFill-${useId()}`;
  const data = evolutionOwnershipData || [];
  const tickFontSize = isMobile ? 12 : 14;
  const yTickWidth = isMobile ? 42 : 60;
  const xHeight = isMobile ? 40 : 40;
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
        {translate("Evolutions ägande", "Evolution ownership")}
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.2, sm: 1.6 }}
        sx={{ flexWrap: "wrap" }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: { xs: "100%", sm: 200 },
            background: "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,116,144,0.25))",
            borderRadius: "16px",
            border: `1px solid rgba(56,189,248,0.35)`,
            px: 2.2,
            py: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
            {translate("Aktieinnehav", "Shareholding")}
          </Typography>
          <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
            {latestEvolutionShares.toLocaleString("sv-SE")}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            {translate("Totalt antal Evolution-ägda aktier", "Total Evolution-owned shares")}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: { xs: "100%", sm: 200 },
            background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(21,128,61,0.2))",
            borderRadius: "16px",
            border: `1px solid rgba(34,197,94,0.35)`,
            px: 2.2,
            py: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
            {translate("Ägarandel", "Ownership share")}
          </Typography>
          <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
            {latestOwnershipPercentage.toFixed(2)}%
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            {translate("Baserat på senaste totala aktiestocken", "Based on latest total share count")}
          </Typography>
        </Box>
        {cancelledShares > 0 && (
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: "100%", sm: 200 },
              background: "linear-gradient(135deg, rgba(248,113,113,0.22), rgba(185,28,28,0.18))",
              borderRadius: "16px",
              border: `1px solid rgba(248,113,113,0.35)`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              {translate("Makulerade aktier", "Cancelled shares")}
            </Typography>
            <Typography variant="h6" sx={{ color: "#fca5a5", fontWeight: 600 }}>
              {cancelledShares.toLocaleString("sv-SE")}
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              {translate("Historiskt indragna sedan programstart", "Retired since program start")}
            </Typography>
          </Box>
        )}
      </Stack>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {translate("Antal aktier över tid", "Shares over time")}
      </Typography>

      <Box
        sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}
      >
        <Tabs
          value={chartTypeOwnership}
          onChange={onChangeChartTypeOwnership}
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
        {chartTypeOwnership === "line" ? (
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: isMobile ? 6 : 20,
              bottom: isMobile ? 14 : 20,
              left: isMobile ? 2 : 0,
            }}
          >
            {/* Gradient för linjeyta */}
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
            {/* Transparent area + linje */}
            <Area
              type="monotone"
              dataKey="shares"
              fill={`url(#${areaFillId})`}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="shares"
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
              dataKey="shares"
              fill={COLORS.accent}
              name={translate("Antal aktier", "Number of shares")}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
      </Box>

      <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 600 }}>
        {translate("Detaljer per år", "Details per year")}
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
                {translate("Aktier", "Shares")}
              </TableCell>
              <TableCell
                sx={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {translate("% ägande", "% ownership")}
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
                  {item.shares.toLocaleString()}
                </TableCell>
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {ownershipPercentageData
                    .find((d) => d.date === item.date)
                    ?.percentage.toFixed(2) || "0.00"}
                  %
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OwnershipView;
