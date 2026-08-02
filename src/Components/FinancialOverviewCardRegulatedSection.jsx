'use client';

// Regulated revenue comparison section for the financial overview card.

import { Box, Stack, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
} from "recharts";

const formatCompactAxisLabel = (value) => value;

export default function FinancialOverviewCardRegulatedSection({
  isMobile,
  translate,
  formatMillion,
  regulatedSeries,
  regulatedRelationshipStats,
  regulatedView,
  onChangeRegulatedView,
  regulatedPlotMode,
  onChangeRegulatedPlotMode,
  regulatedChartType,
  onChangeRegulatedChartType,
  regulatedComparison,
  onChangeRegulatedComparison,
  regulatedXAxisKey,
  regulatedXAxisTicks,
  embedded = false,
}) {
  const comparesMargin = regulatedComparison === "margin";
  const comparisonKey = comparesMargin ? "ebitdaMargin" : "totalRevenue";
  const comparisonLabel = comparesMargin
    ? translate("Justerad EBITDA-marginal", "Adjusted EBITDA margin")
    : translate("Total intäkt", "Total revenue");
  const formatTooltipValue = (value, dataKey) => {
    if (dataKey === "regulatedShare" || dataKey === "ebitdaMargin") {
      return `${Number(value).toFixed(1)}%`;
    }
    return `${formatMillion(Number(value), 1)} €M`;
  };
  const correlation = regulatedRelationshipStats?.correlation;
  const correlationStrength = Number.isFinite(correlation)
    ? Math.abs(correlation) < 0.2
      ? translate("mycket svagt", "very weak")
      : Math.abs(correlation) < 0.4
        ? translate("svagt", "weak")
        : Math.abs(correlation) < 0.6
          ? translate("måttligt", "moderate")
          : Math.abs(correlation) < 0.8
            ? translate("starkt", "strong")
            : translate("mycket starkt", "very strong")
    : translate("ej tillgängligt", "unavailable");
  const correlationDirection = Number.isFinite(correlation)
    ? correlation >= 0
      ? translate("positivt", "positive")
      : translate("negativt", "negative")
    : "";

  return (
    <Box
      sx={{
        mt: embedded ? 0 : { xs: 2.5, md: 3 },
        width: "100%",
        mx: 0,
        background: "rgba(15,23,42,0.55)",
        borderRadius: embedded ? "12px" : 0,
        border: embedded ? "1px solid rgba(148,163,184,0.18)" : 0,
        px: embedded ? { xs: 1.5, md: 2 } : { xs: 2, sm: 3, md: 4, lg: 6 },
        py: embedded ? { xs: 1.5, md: 2 } : { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {comparesMargin
              ? translate("Reglerad andel vs EBITDA-marginal", "Regulated share vs EBITDA margin")
              : translate("Reglerad andel vs total intäkt", "Regulated share vs total revenue")}
          </Typography>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
            {translate(
              comparesMargin
                ? "Jämför reglerad andel med justerad EBITDA-marginal. Sambandet visar samvariation, inte orsakssamband."
                : "Utvecklingen av reglerad intäktsandel jämfört med total intäkt.",
              comparesMargin
                ? "Compares regulated share with adjusted EBITDA margin. The relationship shows correlation, not causation."
                : "Development of regulated revenue share compared with total revenue."
            )}
          </Typography>
          {comparesMargin && regulatedPlotMode === "relationship" ? (
            <Typography sx={{ color: "rgba(186,230,253,0.9)", fontSize: "0.78rem", mt: 0.55 }}>
              {Number.isFinite(correlation)
                ? translate(
                    `Fokuserade axlar · Pearson r ${correlation.toFixed(2)} · ${regulatedRelationshipStats.points.length} observationer · ${correlationStrength} ${correlationDirection} samband`,
                    `Focused axes · Pearson r ${correlation.toFixed(2)} · ${regulatedRelationshipStats.points.length} observations · ${correlationStrength} ${correlationDirection} relationship`
                  )
                : translate(
                    "För få observationer för att beräkna korrelation.",
                    "Too few observations to calculate correlation."
                  )}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <ToggleButtonGroup
            value={regulatedComparison}
            exclusive
            onChange={(_e, value) => value && onChangeRegulatedComparison(value)}
            size="small"
            sx={{ backgroundColor: "rgba(148,163,184,0.12)", borderRadius: "999px", p: 0.4 }}
          >
            <ToggleButton value="revenue" sx={{ textTransform: "none", color: "rgba(226,232,240,0.8)", border: 0, borderRadius: "999px!important", px: { xs: 1.2, md: 1.6 }, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}>
              {translate("Intäkt", "Revenue")}
            </ToggleButton>
            <ToggleButton value="margin" sx={{ textTransform: "none", color: "rgba(226,232,240,0.8)", border: 0, borderRadius: "999px!important", px: { xs: 1.2, md: 1.6 }, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}>
              {translate("Marginal", "Margin")}
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={regulatedView}
            exclusive
            onChange={(_e, v) => v && onChangeRegulatedView(v)}
            size="small"
            sx={{ backgroundColor: "rgba(148,163,184,0.12)", borderRadius: "999px", p: 0.4 }}
          >
            <ToggleButton
              value="quarterly"
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.8)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.2, md: 1.6 },
                "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
              }}
            >
              {translate("Kvartal", "Quarter")}
            </ToggleButton>
            <ToggleButton
              value="annual"
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.8)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.2, md: 1.6 },
                "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
              }}
            >
              {translate("År", "Year")}
            </ToggleButton>
          </ToggleButtonGroup>
          {comparesMargin ? (
            <ToggleButtonGroup
              value={regulatedPlotMode}
              exclusive
              onChange={(_e, value) => value && onChangeRegulatedPlotMode(value)}
              size="small"
              sx={{ backgroundColor: "rgba(148,163,184,0.12)", borderRadius: "999px", p: 0.4 }}
            >
              <ToggleButton value="relationship" sx={{ textTransform: "none", color: "rgba(226,232,240,0.8)", border: 0, borderRadius: "999px!important", px: { xs: 1.2, md: 1.6 }, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}>
                {translate("Samband", "Relationship")}
              </ToggleButton>
              <ToggleButton value="time" sx={{ textTransform: "none", color: "rgba(226,232,240,0.8)", border: 0, borderRadius: "999px!important", px: { xs: 1.2, md: 1.6 }, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}>
                {translate("Över tid", "Over time")}
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null}

          {(!comparesMargin || regulatedPlotMode === "time") ? <ToggleButtonGroup
            value={regulatedChartType}
            exclusive
            onChange={(_e, v) => v && onChangeRegulatedChartType(v)}
            size="small"
            sx={{ backgroundColor: "rgba(148,163,184,0.12)", borderRadius: "999px", p: 0.4 }}
          >
            <ToggleButton
              value="line"
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.8)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.2, md: 1.6 },
                "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
              }}
            >
              {translate("Linje", "Line")}
            </ToggleButton>
            <ToggleButton
              value="bar"
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.8)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.2, md: 1.6 },
                "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
              }}
            >
              {translate("Stapel", "Bar")}
            </ToggleButton>
          </ToggleButtonGroup> : null}
        </Stack>
      </Stack>

      <Box sx={{ height: isMobile ? 230 : 290, mx: { xs: -1, md: 0 } }}>
        <ResponsiveContainer width="100%" height="100%">
          {comparesMargin && regulatedPlotMode === "relationship" ? (
            <ScatterChart margin={isMobile ? { top: 8, right: 8, left: -6, bottom: 8 } : { top: 8, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                type="number"
                dataKey="regulatedShare"
                name={translate("Reglerad andel", "Regulated share")}
                domain={regulatedRelationshipStats?.xDomain || [0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                label={{ value: translate("Reglerad andel", "Regulated share"), position: "insideBottom", offset: -2, fill: "rgba(148,163,184,0.8)", fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                type="number"
                dataKey="ebitdaMargin"
                name={comparisonLabel}
                domain={regulatedRelationshipStats?.yDomain || [0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                width={isMobile ? 38 : 52}
                label={{ value: translate("EBITDA-marginal", "EBITDA margin"), angle: -90, position: "insideLeft", fill: "rgba(148,163,184,0.8)", fontSize: isMobile ? 10 : 12 }}
              />
              <ZAxis range={[isMobile ? 42 : 58, isMobile ? 42 : 58]} />
              <RechartsTooltip
                cursor={{ strokeDasharray: "4 4" }}
                wrapperStyle={{ zIndex: 20, outline: "none" }}
                contentStyle={{ backgroundColor: "#0f172a", opacity: 1, border: "1px solid rgba(125,211,252,0.55)", borderRadius: 12, color: "#f8fafc", boxShadow: "0 12px 28px rgba(0,0,0,0.38)" }}
                labelStyle={{ color: "#f8fafc", fontWeight: 700, marginBottom: 4 }}
                itemStyle={{ color: "#dbeafe", fontWeight: 600 }}
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
              />
              <Scatter
                name={translate("Kvartal/år", "Quarter/year")}
                data={regulatedRelationshipStats?.points || []}
                fill="#34d399"
                line={{ stroke: "#60a5fa", strokeWidth: 2, strokeDasharray: "6 5" }}
                lineType="fitting"
              />
            </ScatterChart>
          ) : regulatedChartType === "line" ? (
            <LineChart
              data={regulatedSeries}
              margin={isMobile ? { top: 5, right: 2, left: -8, bottom: 0 } : { top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey={regulatedXAxisKey}
                ticks={regulatedXAxisTicks}
                interval={0}
                tickFormatter={formatCompactAxisLabel}
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                minTickGap={isMobile ? 22 : 16}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickFormatter={(v) => (comparesMargin ? `${Number(v).toFixed(0)}%` : formatMillion(v, v >= 100 ? 0 : 1))}
                domain={comparesMargin ? [0, 100] : undefined}
                width={isMobile ? 36 : 52}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                domain={[0, 100]}
                width={isMobile ? 32 : 44}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value, _name, props) => formatTooltipValue(value, props?.dataKey)}
              />
              <Legend wrapperStyle={{ color: "rgba(226,232,240,0.78)" }} />
              <Line
                type="monotone"
                dataKey={comparisonKey}
                name={comparisonLabel}
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={false}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="regulatedShare"
                name={translate("Reglerad andel", "Regulated share")}
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
                yAxisId="right"
              />
            </LineChart>
          ) : (
            <ComposedChart
              data={regulatedSeries}
              margin={isMobile ? { top: 5, right: 2, left: -8, bottom: 0 } : { top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey={regulatedXAxisKey}
                ticks={regulatedXAxisTicks}
                interval={0}
                tickFormatter={formatCompactAxisLabel}
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                minTickGap={isMobile ? 22 : 16}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickFormatter={(v) => (comparesMargin ? `${Number(v).toFixed(0)}%` : formatMillion(v, v >= 100 ? 0 : 1))}
                domain={comparesMargin ? [0, 100] : undefined}
                width={isMobile ? 36 : 52}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                domain={[0, 100]}
                width={isMobile ? 32 : 44}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value, _name, props) => formatTooltipValue(value, props?.dataKey)}
              />
              <Legend wrapperStyle={{ color: "rgba(226,232,240,0.78)" }} />
              <Bar
                dataKey={comparisonKey}
                name={comparisonLabel}
                fill="#60a5fa"
                radius={[6, 6, 0, 0]}
                barSize={regulatedView === "quarterly" ? 14 : 26}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="regulatedShare"
                name={translate("Reglerad andel", "Regulated share")}
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                yAxisId="right"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
