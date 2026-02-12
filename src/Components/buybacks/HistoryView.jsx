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

const PERIOD_LABELS = {
  daily: { singular: { sv: "dag", en: "day" }, plural: { sv: "dagar", en: "days" } },
  weekly: { singular: { sv: "vecka", en: "week" }, plural: { sv: "veckor", en: "weeks" } },
  monthly: { singular: { sv: "månad", en: "month" }, plural: { sv: "månader", en: "months" } },
  yearly: { singular: { sv: "år", en: "year" }, plural: { sv: "år", en: "years" } },
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
  const translate = useTranslate();
  const areaFillId = `histArea-${useId()}`;
  const tickFontSize = isMobile ? 10 : 14;
  const yTickWidth = isMobile ? 40 : 60;
  const xHeight = isMobile ? 44 : 60;
  const formatCompactMobileTick = (value) => {
    if (!Number.isFinite(value)) return "–";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}M`;
    if (abs >= 1_000) return `${(value / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
    return value.toLocaleString("sv-SE");
  };
  const yTickFormatter = isMobile ? formatCompactMobileTick : formatYAxisTick;
  const periodLabelBase = PERIOD_LABELS[viewMode] ?? PERIOD_LABELS.daily;
  const periodLabel = {
    singular: translate(periodLabelBase.singular.sv, periodLabelBase.singular.en),
    plural: translate(periodLabelBase.plural.sv, periodLabelBase.plural.en),
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

  const xLabel = translate(
    viewMode === "daily"
      ? "Datum"
      : viewMode === "weekly"
      ? "Vecka"
      : viewMode === "monthly"
      ? "Månad"
      : "År",
    viewMode === "daily"
      ? "Date"
      : viewMode === "weekly"
      ? "Week"
      : viewMode === "monthly"
      ? "Month"
      : "Year"
  );
  const datasetTitle = translate(
    viewMode === "daily"
      ? "Dagliga återköp"
      : viewMode === "weekly"
      ? "Veckovisa återköp"
      : viewMode === "monthly"
      ? "Månadsvisa återköp"
      : "Årliga återköp",
    viewMode === "daily"
      ? "Daily buybacks"
      : viewMode === "weekly"
      ? "Weekly buybacks"
      : viewMode === "monthly"
      ? "Monthly buybacks"
      : "Yearly buybacks"
  );
  const pointCount = Array.isArray(historyChartData) ? historyChartData.length : 0;
  const xAxisInterval = useMemo(() => {
    if (!pointCount) return 0;
    if (viewMode === "daily") {
      const targetTicks = isMobile ? 6 : 18;
      return Math.max(Math.ceil(pointCount / targetTicks) - 1, 0);
    }
    if (viewMode === "weekly") {
      const targetTicks = isMobile ? 6 : 14;
      return Math.max(Math.ceil(pointCount / targetTicks) - 1, 0);
    }
    return isMobile ? "preserveStartEnd" : 0;
  }, [isMobile, pointCount, viewMode]);
  const xAxisTickFormatter = useMemo(() => {
    if (viewMode !== "daily") return undefined;
    return (value) => {
      if (typeof value !== "string") return value;
      // YYYY-MM-DD -> MM-DD to keep daily axis readable
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(5);
      return value;
    };
  }, [viewMode]);

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 1.2, md: 3 },
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
        {translate("Återköpshistorik", "Buyback history")}
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
              {translate(
                `Genomsnitt per ${periodLabel.singular}`,
                `Average per ${periodLabel.singular}`
              )}
            </Typography>
            <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
              {translate(
                `${formatShares(summary.avgShares, summary.avgShares < 10 ? 1 : 0)} aktier`,
                `${formatShares(summary.avgShares, summary.avgShares < 10 ? 1 : 0)} shares`
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
              {translate(
                `≈ ${formatCurrency(summary.avgValue)} per ${periodLabel.singular}`,
                `≈ ${formatCurrency(summary.avgValue)} per ${periodLabel.singular}`
              )}
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
              {translate("Genomsnittlig snittkurs (alla återköp)", "Average buyback price")}
            </Typography>
            <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 700 }}>
              {formatPrice(historicalTotals?.averagePrice)}
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
              {translate(
                `Totalt ${formatShares(historicalTotals?.shares)} aktier`,
                `Total ${formatShares(historicalTotals?.shares)} shares`
              )}
            </Typography>
            {historicalTotals?.value > 0 && (
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                {translate(
                  `Investerat ${formatCurrency(historicalTotals.value)}`,
                  `Invested ${formatCurrency(historicalTotals.value)}`
                )}
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
                {translate("Historiskt återköp – vinst/förlust", "Historical buybacks – P&L")}
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: pnlColor(historicalPnL.absolute), fontWeight: 700 }}
              >
                {formatCurrency(historicalPnL.absolute)}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                {translate(
                  `Snitt ${formatPrice(historicalPnL.averagePrice)} • Live ${formatPrice(currentSharePrice)} • ${formatPercent(historicalPnL.percent)}`,
                  `Avg ${formatPrice(historicalPnL.averagePrice)} • Live ${formatPrice(currentSharePrice)} • ${formatPercent(historicalPnL.percent)}`
                )}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                {translate(
                  `Totalt ${formatShares(Math.round(historicalPnL.shares || 0))} aktier • Investering ${formatCurrency(historicalPnL.invested)}`,
                  `Total ${formatShares(Math.round(historicalPnL.shares || 0))} shares • Invested ${formatCurrency(historicalPnL.invested)}`
                )}
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
          <Tab label={translate("Daglig", "Daily")} value="daily" />
          <Tab label={translate("Veckovis", "Weekly")} value="weekly" />
          <Tab label={translate("Månadsvis", "Monthly")} value="monthly" />
          <Tab label={translate("Årlig", "Yearly")} value="yearly" />
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
          <Tab label={translate("Linje", "Line")} value="line" />
          <Tab label={translate("Stapel", "Bar")} value="bar" />
        </Tabs>
      </Box>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {datasetTitle}
      </Typography>

      <Box sx={{ width: "100%", mx: { xs: -0.6, md: 0 } }}>
      <ResponsiveContainer width="100%" height={isMobile ? 280 : 300}>
        {chartTypeHistory === "line" ? (
          <ComposedChart
            data={historyChartData}
            margin={{
              top: 10,
              right: isMobile ? 4 : 20,
              bottom: isMobile ? 40 : viewMode === "daily" ? 24 : 32,
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
              angle={isMobile ? -45 : viewMode === "daily" ? -30 : 0}
              textAnchor={isMobile || viewMode === "daily" ? "end" : "middle"}
              height={isMobile ? xHeight : viewMode === "daily" ? 52 : xHeight}
              interval={xAxisInterval}
              minTickGap={isMobile ? 22 : 8}
              tickFormatter={xAxisTickFormatter}
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
              right: isMobile ? 4 : 20,
              bottom: isMobile ? 40 : viewMode === "daily" ? 24 : 32,
              left: isMobile ? 0 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="Datum"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              angle={isMobile ? -45 : viewMode === "daily" ? -30 : 0}
              textAnchor={isMobile || viewMode === "daily" ? "end" : "middle"}
              height={isMobile ? xHeight : viewMode === "daily" ? 52 : xHeight}
              interval={xAxisInterval}
              minTickGap={isMobile ? 22 : 8}
              tickFormatter={xAxisTickFormatter}
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
              dataKey="Antal_aktier"
              fill={COLORS.accent}
              name={translate("Antal aktier", "Number of shares")}
              radius={[6, 6, 0, 0]}
            />
            {/* Brush borttagen */}
          </BarChart>
        )}
      </ResponsiveContainer>
      </Box>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        {translate("Transaktioner", "Transactions")}
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
                {translate("Datum", "Date")} {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
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
                {translate("Antal aktier", "Number of shares")} {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
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
                {translate("Transaktionsvärde (SEK)", "Transaction value (SEK)")}{" "}
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
