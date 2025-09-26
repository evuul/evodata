"use client";
import React, { useId } from "react";
import { Box, Tabs, Tab, Typography, Chip } from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
} from "recharts";

const EPSSection = ({
  isMobile,
  viewMode,
  onChangeViewMode,
  chartTypeEPS,
  onChangeChartTypeEPS,
  quarterlyGrowth,
  yearlyGrowth,
  epsQuarterlyXTicks,
  epsYearlyXTicks,
  epsQuarterlyYConfig,
  epsYearlyYConfig,
  formatEPSTick,
}) => {
  // YoY för senaste kvartal
  const latestQuarter = (() => {
    const valid = (quarterlyGrowth || []).filter((i) => i.value !== null);
    return valid[valid.length - 1];
  })();
  const latestQuarterYoY = latestQuarter?.growth != null ? Number(latestQuarter.growth) : null;

  // Unikt gradient-ID
  const areaFillId = `epsAreaFill-${useId()}`;

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

      <Tabs
        value={chartTypeEPS}
        onChange={onChangeChartTypeEPS}
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: "#00e676" } }}
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
        <Tab label="Linje" value="line" />
        <Tab label="Stapel" value="bar" />
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
        {viewMode === "quarterly"
          ? "Intjäning per aktie per kvartal"
          : "Intjäning per aktie per helår"}
      </Typography>

      {viewMode === "quarterly" && latestQuarter?.growth != null && (
        <>
          <Typography
            variant="body2"
            color={
              latestQuarter.growth > 0
                ? "#00e676"
                : latestQuarter.growth < 0
                ? "#ff1744"
                : "#b0b0b0"
            }
            sx={{
              marginBottom: "6px",
              textAlign: "center",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            {latestQuarter.growth > 0
              ? "Ökning"
              : latestQuarter.growth < 0
              ? "Minskning"
              : "Oförändrat"}
            {` jämfört med ${latestQuarter.year - 1} ${
              latestQuarter.quarter
            }: ${latestQuarter.growth}%`}
          </Typography>
          {latestQuarter?.value != null && (
            <Typography
              variant="body2"
              sx={{
                marginBottom: "10px",
                textAlign: "center",
                color: "#b0b0b0",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              {`Senaste EPS: ${Number(latestQuarter.value).toLocaleString(
                "sv-SE",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )} SEK`}
            </Typography>
          )}
        </>
      )}

      {viewMode === "quarterly" && latestQuarterYoY != null && (
        <Box sx={{ mb: 1 }}>
          <Chip
            size="small"
            label={`YoY senaste kvartal: ${
              latestQuarterYoY >= 0 ? "+" : ""
            }${Number(latestQuarterYoY).toFixed(1)}%`}
            sx={{
              backgroundColor: latestQuarterYoY >= 0 ? "#1b5e20" : "#4a0b0b",
              color: "#fff",
              fontWeight: 600,
            }}
          />
        </Box>
      )}

      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        {chartTypeEPS === "line" ? (
          <ComposedChart
            data={viewMode === "quarterly" ? quarterlyGrowth : yearlyGrowth}
            margin={{
              top: 16,
              right: 12,
              bottom: isMobile ? 48 : 24,
              left: isMobile ? 16 : 48,
            }}
          >
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
              ticks={viewMode === "quarterly" ? epsQuarterlyXTicks : epsYearlyXTicks}
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
              tickFormatter={formatEPSTick}
              width={isMobile ? 56 : 72}
              domain={
                viewMode === "quarterly"
                  ? epsQuarterlyYConfig.domain
                  : epsYearlyYConfig.domain
              }
              ticks={
                viewMode === "quarterly"
                  ? epsQuarterlyYConfig.ticks
                  : epsYearlyYConfig.ticks
              }
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label
                  value="Intjäning per aktie (SEK)"
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
                const growth = props.payload.growth;
                return [
                  value !== null
                    ? `${value.toLocaleString("sv-SE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} SEK`
                    : "Ingen data",
                  growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig",
                ];
              }}
              contentStyle={{
                backgroundColor: "#2e2e2e",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
              }}
            />
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
        ) : (
          <BarChart
            data={viewMode === "quarterly" ? quarterlyGrowth : yearlyGrowth}
            margin={{
              top: 16,
              right: 12,
              bottom: isMobile ? 48 : 24,
              left: isMobile ? 16 : 48,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="date"
              stroke="#ccc"
              ticks={viewMode === "quarterly" ? epsQuarterlyXTicks : epsYearlyXTicks}
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
              tickFormatter={formatEPSTick}
              width={isMobile ? 56 : 72}
              domain={
                viewMode === "quarterly"
                  ? epsQuarterlyYConfig.domain
                  : epsYearlyYConfig.domain
              }
              ticks={
                viewMode === "quarterly"
                  ? epsQuarterlyYConfig.ticks
                  : epsYearlyYConfig.ticks
              }
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label
                  value="Intjäning per aktie (SEK)"
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
                const growth = props.payload.growth;
                return [
                  value !== null
                    ? `${value.toLocaleString("sv-SE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} SEK`
                    : "Ingen data",
                  growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig",
                ];
              }}
              contentStyle={{
                backgroundColor: "#2e2e2e",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
              }}
            />
            <Bar dataKey="value" fill="#00e676" name="Intjäning per aktie" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
};

export default EPSSection;