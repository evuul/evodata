"use client";
import React, { useId, useMemo } from "react";
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

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  textPrimary: "#f8fafc",
  textSecondary: "rgba(203,213,225,0.78)",
  accent: "#38bdf8",
  grid: "rgba(148,163,184,0.14)",
  tooltipBg: "rgba(15,23,42,0.92)",
};

const HistoryView = ({
  isMobile,
  viewMode,
  onChangeViewMode,
  chartTypeHistory,
  onChangeChartTypeHistory,
  historyChartData,
  yDomain,
  yTicks,
  formatYAxisTick,
  sortedData,
  sortConfig,
  onSort,
  historicalPnL,
  currentSharePrice,
  historicalTotals,
}) => {
  const areaFillId = `histArea-${useId()}`;
  const tickFontSize = isMobile ? 12 : 14;
  const yTickWidth = isMobile ? 40 : 60;
  const xHeight = isMobile ? 40 : 60;

  const periodLabels = {
    daily: { singular: "dag", plural: "dagar" },
    weekly: { singular: "vecka", plural: "veckor" },
    monthly: { singular: "månad", plural: "månader" },
    yearly: { singular: "år", plural: "år" },
  };

  const formatShares = (value, decimals = 0) =>
    Number.isFinite(value)
      ? value.toLocaleString("sv-SE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : "–";

  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) return "–";
    const digits = Math.abs(value) >= 1_000_000 ? 0 : 2;
    return value.toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const formatPrice = (value) =>
    Number.isFinite(value)
      ? value.toLocaleString("sv-SE", {
          style: "currency",
          currency: "SEK",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "–";
  const formatPercent = (value) =>
    Number.isFinite(value)
      ? `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(1)}%`
      : "–";

  const pnlColor = (value) =>
    !Number.isFinite(value) || value === 0
      ? COLORS.textSecondary
      : value > 0
      ? "#34d399"
      : "#f87171";

  const summary = useMemo(() => {
    if (!Array.isArray(historyChartData) || historyChartData.length === 0) {
      return null;
    }
    let totalShares = 0;
    let totalValue = 0;
    historyChartData.forEach((row) => {
      totalShares += Number(row?.Antal_aktier) || 0;
      totalValue += Number(row?.Transaktionsvärde) || 0;
    });
    const count = historyChartData.length;
    const avgShares = count > 0 ? totalShares / count : 0;
    const avgValue = count > 0 ? totalValue / count : 0;
    const avgPrice = totalShares > 0 ? totalValue / totalShares : 0;
    return {
      totalShares,
      totalValue,
      count,
      avgShares,
      avgValue,
      avgPrice,
    };
  }, [historyChartData]);

  const periodLabel = periodLabels[viewMode] ?? periodLabels.daily;

  const xLabel =
    viewMode === "daily"
      ? "Datum"
      : viewMode === "weekly"
      ? "Vecka"
      : viewMode === "monthly"
      ? "Månad"
      : "År";

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 2.2, md: 3 },
        py: { xs: 2.6, md: 3.2 },
        display: "flex",
        flexDirection: "column",
        gap: 2.4,
        overflowX: "hidden",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.55rem" },
        }}
      >
        Återköpshistorik
      </Typography>

      {summary && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.6, sm: 2 }}>
          <Box
            sx={{
              flex: 1,
              background: "linear-gradient(140deg, rgba(56,189,248,0.22), rgba(14,116,144,0.22))",
              borderRadius: "16px",
              border: `1px solid rgba(56,189,248,0.32)`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              Genomsnitt per {periodLabel.singular}
            </Typography>
            <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
              {formatShares(summary.avgShares, summary.avgShares < 10 ? 1 : 0)} aktier
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
              ≈ {formatCurrency(summary.avgValue)} per {periodLabel.singular}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              background: "rgba(15,23,42,0.45)",
              borderRadius: "16px",
              border: `1px solid ${COLORS.border}`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              Genomsnittlig snittkurs (alla återköp)
            </Typography>
            <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 700 }}>
              {formatPrice(historicalTotals?.averagePrice)}
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
              Totalt {formatShares(historicalTotals?.shares)} aktier
            </Typography>
            {historicalTotals?.value > 0 && (
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Investerat {formatCurrency(historicalTotals.value)}
              </Typography>
            )}
          </Box>

          {historicalPnL && (
            <Box
              sx={{
                flex: 1,
                background: "linear-gradient(140deg, rgba(52,211,153,0.18), rgba(56,189,248,0.18))",
                borderRadius: "16px",
                border: "1px solid rgba(52,211,153,0.32)",
                px: 2.2,
                py: 1.8,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
                Historiskt återköp – vinst/förlust
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: pnlColor(historicalPnL.absolute), fontWeight: 700 }}
              >
                {formatCurrency(historicalPnL.absolute)}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                Snitt {formatPrice(historicalPnL.averagePrice)} • Live {formatPrice(currentSharePrice)}
                {" • "}
                {formatPercent(historicalPnL.percent)}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Totalt {formatShares(Math.round(historicalPnL.shares || 0))} aktier • Investering {formatCurrency(historicalPnL.invested)}
              </Typography>
            </Box>
          )}
        </Stack>
      )}

      {/* Välj tidsskala */}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs
          value={viewMode}
          onChange={onChangeViewMode}
          textColor="inherit"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "rgba(15,23,42,0.45)",
            borderRadius: "999px",
            p: 0.5,
            minHeight: "unset",
            "& .MuiTabs-flexContainer": { gap: 0.8 },
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
          <Tab label="Daglig" value="daily" />
          <Tab label="Veckovis" value="weekly" />
          <Tab label="Månadsvis" value="monthly" />
          <Tab label="Årlig" value="yearly" />
        </Tabs>
      </Box>

      {/* Välj diagramtyp */}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs
          value={chartTypeHistory}
          onChange={onChangeChartTypeHistory}
          textColor="inherit"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "rgba(15,23,42,0.45)",
            borderRadius: "999px",
            p: 0.5,
            minHeight: "unset",
            "& .MuiTabs-flexContainer": { gap: 0.8 },
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
          <Tab label="Linje" value="line" />
          <Tab label="Stapel" value="bar" />
        </Tabs>
      </Box>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {viewMode === "daily"
          ? "Dagliga återköp"
          : viewMode === "weekly"
          ? "Veckovisa återköp"
          : viewMode === "monthly"
          ? "Månadsvisa återköp"
          : "Årliga återköp"}
      </Typography>

      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        {chartTypeHistory === "line" ? (
          <ComposedChart
            data={historyChartData}
            margin={{
              top: 10,
              right: isMobile ? 10 : 20,
              bottom: isMobile ? 40 : 40,
              left: isMobile ? 0 : 0,
            }}
          >
            {/* Transparent accent area under linjen */}
            <defs>
              <linearGradient id={areaFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="Datum"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value={xLabel}
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
              tickFormatter={formatYAxisTick}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value="Antal aktier"
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
              dataKey="Antal_aktier"
              fill={`url(#${areaFillId})`}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="Antal_aktier"
              stroke={COLORS.accent}
              strokeWidth={2.4}
              dot={{ r: 3.6, fill: COLORS.accent }}
              activeDot={{ r: 6, stroke: COLORS.surface, strokeWidth: 2 }}
            />
            {/* Brush borttagen */}
          </ComposedChart>
        ) : (
          <BarChart
            data={historyChartData}
            margin={{
              top: 10,
              right: isMobile ? 10 : 20,
              bottom: isMobile ? 40 : 40,
              left: isMobile ? 0 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="Datum"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value={xLabel}
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
              tickFormatter={formatYAxisTick}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value="Antal aktier"
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
              dataKey="Antal_aktier"
              fill={COLORS.accent}
              name="Antal aktier"
              radius={[6, 6, 0, 0]}
            />
            {/* Brush borttagen */}
          </BarChart>
        )}
      </ResponsiveContainer>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        Transaktioner
      </Typography>
      <TableContainer
        sx={{
          backgroundColor: "rgba(15,23,42,0.5)",
          borderRadius: "16px",
          border: `1px solid ${COLORS.border}`,
          backdropFilter: "blur(12px)",
          maxHeight: 420,
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{ minWidth: isMobile ? 520 : "auto" }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  color: 'rgba(226,232,240,0.82)',
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: 'rgba(15,23,42,0.75)',
                }}
                onClick={() => onSort("Datum")}
              >
                Datum {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell
                sx={{
                  color: 'rgba(226,232,240,0.82)',
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: 'rgba(15,23,42,0.75)',
                }}
                onClick={() => onSort("Antal_aktier")}
              >
                Antal aktier {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell
                sx={{
                  color: 'rgba(226,232,240,0.82)',
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: 'rgba(15,23,42,0.75)',
                }}
                onClick={() => onSort("Transaktionsvärde")}
              >
                Transaktionsvärde (SEK){" "}
                {sortConfig.key === "Transaktionsvärde" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(148,163,184,0.06)",
                  },
                }}
              >
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.Datum}
                </TableCell>
                <TableCell
                  sx={{
                    color: item.Antal_aktier < 0 ? "#fca5a5" : COLORS.textPrimary,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {item.Antal_aktier.toLocaleString()}
                </TableCell>
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.Transaktionsvärde
                    ? item.Transaktionsvärde.toLocaleString()
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HistoryView;
