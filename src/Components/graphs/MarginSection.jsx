"use client";
import React, { useId } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  Line,
  ComposedChart,
  Area,
} from "recharts";

const MarginSection = ({
  isMobile,
  viewMode,
  onChangeViewMode,
  marginQuarterlyChange,
  marginYearlyChange,
  marginQuarterlyXTicks,
  marginYearlyXTicks,
  marginQuarterlyYConfig,
  marginYearlyYConfig,
  formatMarginTick,
}) => {
  const latestQuarter = (() => {
    const valid = (marginQuarterlyChange || []).filter((i) => i.value !== null);
    return valid[valid.length - 1];
  })();

  // Unikt gradient-id för fyllnaden
  const areaFillId = `marginAreaFill-${useId()}`;

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Tabs
        value={viewMode}
        onChange={onChangeViewMode}
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
        sx={{
          color: "#b0b0b0",
          marginBottom: "12px",
          "& .MuiTab-root": {
            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
            padding: { xs: "6px 8px", sm: "12px 16px" },
          },
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label="Per kvartal" value="quarterly" />
        <Tab label="Per helår" value="yearly" />
      </Tabs>

      <Typography
        variant="h6"
        color="#ffffff"
        sx={{
          marginBottom: "10px",
          textAlign: "center",
          fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
        }}
      >
        {viewMode === "quarterly" ? "Marginal per kvartal" : "Marginal per helår"}
      </Typography>

      {viewMode === "quarterly" && latestQuarter?.change && (
        <Typography
          variant="body2"
          color={latestQuarter.change >= 0 ? "#00e676" : "#ff1744"}
          sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
        >
          Förändring jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}:{" "}
          {latestQuarter.change >= 0 ? "+" : ""}
          {latestQuarter.change} procentenheter
        </Typography>
      )}

      {viewMode === "yearly" &&
        (marginYearlyChange?.length || 0) > 0 &&
        marginYearlyChange[marginYearlyChange.length - 1].change && (
          <Typography
            variant="body2"
            color={
              marginYearlyChange[marginYearlyChange.length - 1].change >= 0
                ? "#00e676"
                : "#ff1744"
            }
            sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
          >
            Förändring jämfört med{" "}
            {marginYearlyChange[marginYearlyChange.length - 1].year - 1}:{" "}
            {marginYearlyChange[marginYearlyChange.length - 1].change >= 0 ? "+" : ""}
            {marginYearlyChange[marginYearlyChange.length - 1].change} procentenheter
          </Typography>
        )}

      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        <ComposedChart
          data={viewMode === "quarterly" ? marginQuarterlyChange : marginYearlyChange}
          margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}
        >
          {/* Gradient för linjens yta */}
          <defs>
            <linearGradient id={areaFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e676" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="date"
            stroke="#ccc"
            ticks={viewMode === "quarterly" ? marginQuarterlyXTicks : marginYearlyXTicks}
            interval={0}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 60 : 40}
            tick={{ fontSize: isMobile ? 12 : 14 }}
          >
            {!isMobile && (
              <Label
                value="Datum"
                offset={-10}
                position="insideBottom"
                fill="#ccc"
                style={{ fontSize: isMobile ? "12px" : "14px" }}
              />
            )}
          </XAxis>
          <YAxis
            stroke="#ccc"
            domain={
              viewMode === "quarterly"
                ? marginQuarterlyYConfig.domain
                : marginYearlyYConfig.domain
            }
            ticks={
              viewMode === "quarterly"
                ? marginQuarterlyYConfig.ticks
                : marginYearlyYConfig.ticks
            }
            tickFormatter={formatMarginTick}
            width={isMobile ? 48 : 64}
            tick={{ fontSize: isMobile ? 10 : 14 }}
          >
            {!isMobile && (
              <Label
                value="Marginal (%)"
                angle={-90}
                offset={-10}
                position="insideLeft"
                fill="#ccc"
                style={{ fontSize: isMobile ? "12px" : "14px" }}
              />
            )}
          </YAxis>
          <Tooltip
            formatter={(value, name, props) => {
              const change = props.payload.change;
              return [
                value !== null ? `${value.toLocaleString("sv-SE")}%` : "Ingen data",
                change
                  ? `Förändring: ${change >= 0 ? "+" : ""}${change} procentenheter`
                  : "Ingen jämförelse tillgänglig",
              ];
            }}
            contentStyle={{
              backgroundColor: "#2e2e2e",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
            }}
          />

          {/* Transparent area + linje */}
          <Area
            type="monotone"
            dataKey="value"
            fill={`url(#${areaFillId})`}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#00e676"
            strokeWidth={2}
            dot={{ r: 4, fill: "#00e676" }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MarginSection;