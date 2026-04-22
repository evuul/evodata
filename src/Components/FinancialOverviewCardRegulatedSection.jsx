'use client';

// Regulated revenue comparison section for the financial overview card.

import { Box, Stack, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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
  regulatedView,
  onChangeRegulatedView,
  regulatedChartType,
  onChangeRegulatedChartType,
  regulatedXAxisKey,
  regulatedXAxisTicks,
}) {
  const formatTooltipValue = (value, dataKey) => {
    if (dataKey === "regulatedShare") {
      return `${Number(value).toFixed(1)}%`;
    }
    return `${formatMillion(Number(value), 1)} €M`;
  };

  return (
    <Box
      sx={{
        mt: { xs: 2.5, md: 3 },
        width: "100vw",
        mx: "calc(50% - 50vw)",
        background: "rgba(15,23,42,0.55)",
        borderRadius: 0,
        borderTop: "1px solid rgba(148,163,184,0.18)",
        borderBottom: "1px solid rgba(148,163,184,0.18)",
        px: { xs: 2, sm: 3, md: 4, lg: 6 },
        py: { xs: 2.5, md: 3 },
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
            {translate("Reglerade intäkter vs total (YoY)", "Regulated revenue vs total (YoY)")}
          </Typography>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
            {translate(
              "Årlig utveckling av reglerade marknader jämfört med total intäkt.",
              "Annual regulated-market revenue compared with total revenue."
            )}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
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

          <ToggleButtonGroup
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
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ height: isMobile ? 240 : 300, mx: { xs: -1, md: 0 } }}>
        <ResponsiveContainer width="100%" height="100%">
          {regulatedChartType === "line" ? (
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
                tickFormatter={(v) => formatMillion(v, v >= 100 ? 0 : 1)}
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
                dataKey="totalRevenue"
                name={translate("Total intäkt", "Total revenue")}
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
                tickFormatter={(v) => formatMillion(v, v >= 100 ? 0 : 1)}
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
                dataKey="totalRevenue"
                name={translate("Total intäkt", "Total revenue")}
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
