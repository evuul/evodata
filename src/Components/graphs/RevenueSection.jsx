"use client";
import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

const RevenueSection = ({
  isMobile,
  viewMode,
  onChangeViewMode,
  chartType,
  onChangeChartType,
  revenueQuarterlyGrowth,
  revenueYearlyGrowth,
  revenueQuarterlyXTicks,
  revenueYearlyXTicks,
  revenueQuarterlyYConfig,
  revenueYearlyYConfig,
  formatRevenueTick,
}) => {
  const latestQuarter = (() => {
    const valid = (revenueQuarterlyGrowth || []).filter((i) => i.value !== null);
    return valid[valid.length - 1];
  })();

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
        value={chartType}
        onChange={onChangeChartType}
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
        {viewMode === "quarterly" ? "Omsättning per kvartal" : "Omsättning per helår"}
      </Typography>

      {viewMode === "quarterly" && latestQuarter?.growth && (
        <Typography
          variant="body2"
          color={latestQuarter.growth >= 0 ? "#00e676" : "#ff1744"}
          sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
        >
          Ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.growth}%
        </Typography>
      )}

      {viewMode === "yearly" && (revenueYearlyGrowth?.length || 0) > 0 && revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth && (
        <Typography
          variant="body2"
          color={revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth >= 0 ? "#00e676" : "#ff1744"}
          sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
        >
          Tillväxt jämfört med {revenueYearlyGrowth[revenueYearlyGrowth.length - 1].year - 1}: {revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth}%
        </Typography>
      )}

      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        {chartType === "line" ? (
          <LineChart
            data={viewMode === "quarterly" ? revenueQuarterlyGrowth : revenueYearlyGrowth}
            margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}
            connectNulls={false}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="date"
              stroke="#ccc"
              ticks={viewMode === "quarterly" ? revenueQuarterlyXTicks : revenueYearlyXTicks}
              interval={0}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 60 : 40}
              tick={{ fontSize: isMobile ? 12 : 14 }}
            >
              {!isMobile && (
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
              )}
            </XAxis>
            <YAxis
              stroke="#ccc"
              tickFormatter={formatRevenueTick}
              width={isMobile ? 48 : 64}
              domain={viewMode === "quarterly" ? revenueQuarterlyYConfig.domain : revenueYearlyYConfig.domain}
              ticks={viewMode === "quarterly" ? revenueQuarterlyYConfig.ticks : revenueYearlyYConfig.ticks}
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label value="Omsättning (MEURO)" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
              )}
            </YAxis>
            <Tooltip
              formatter={(value, name, props) => {
                const growth = props.payload.growth;
                return [value !== null ? `${value.toLocaleString("sv-SE")} MEURO` : "Ingen data", growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig"];
              }}
              contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
            />
            <Line type="monotone" dataKey="value" stroke="#00e676" strokeWidth={2} dot={{ r: 4, fill: "#00e676" }} activeDot={{ r: 6 }} />
          </LineChart>
        ) : (
          <BarChart data={viewMode === "quarterly" ? revenueQuarterlyGrowth : revenueYearlyGrowth} margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="date"
              stroke="#ccc"
              ticks={viewMode === "quarterly" ? revenueQuarterlyXTicks : revenueYearlyXTicks}
              interval={0}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 60 : 40}
              tick={{ fontSize: isMobile ? 12 : 14 }}
            >
              {!isMobile && (
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
              )}
            </XAxis>
            <YAxis
              stroke="#ccc"
              tickFormatter={formatRevenueTick}
              width={isMobile ? 48 : 64}
              domain={viewMode === "quarterly" ? revenueQuarterlyYConfig.domain : revenueYearlyYConfig.domain}
              ticks={viewMode === "quarterly" ? revenueQuarterlyYConfig.ticks : revenueYearlyYConfig.ticks}
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label value="Omsättning (MEURO)" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
              )}
            </YAxis>
            <Tooltip
              formatter={(value, name, props) => {
                const growth = props.payload.growth;
                return [value !== null ? `${value.toLocaleString("sv-SE")} MEURO` : "Ingen data", growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig`"];
              }}
              contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
            />
            <Bar dataKey="value" fill="#00e676" name="Omsättning" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
};

export default RevenueSection;
