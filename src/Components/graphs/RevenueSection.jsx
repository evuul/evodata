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
  BarChart,
  Bar,
  ComposedChart,
  Area,
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

  const latestQuarterYoY = latestQuarter?.growth != null ? Number(latestQuarter.growth) : null;

  const ytdCompare = (() => {
    const qOrder = ["Q1", "Q2", "Q3", "Q4"];
    const valid = (revenueQuarterlyGrowth || []).filter((i) => i.value != null);
    if (valid.length === 0) return null;
    const currentYear = Math.max(...valid.map((d) => d.year));
    const currentYearPoints = valid.filter((d) => d.year === currentYear);
    if (currentYearPoints.length === 0) return null;
    let latestIdx = -1;
    for (let i = qOrder.length - 1; i >= 0; i--) {
      if (currentYearPoints.some((d) => d.quarter === qOrder[i])) { latestIdx = i; break; }
    }
    if (latestIdx < 0) return null;
    const upto = qOrder.slice(0, latestIdx + 1);
    const curYTD = valid
      .filter((d) => d.year === currentYear && upto.includes(d.quarter))
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    const prevYTD = valid
      .filter((d) => d.year === currentYear - 1 && upto.includes(d.quarter))
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    if (!(prevYTD > 0)) return { label: `YTD ${currentYear} ${upto[0]}–${upto[upto.length-1]}`, curYTD, prevYTD: null, growth: null };
    const growth = ((curYTD - prevYTD) / prevYTD) * 100;
    return { label: `YTD ${currentYear} ${upto[0]}–${upto[upto.length-1]}`, curYTD, prevYTD, growth };
  })();

  // Unikt gradient-id för linjeytan
  const areaFillId = `revAreaFill-${useId()}`;

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Tabs
        value={viewMode}
        onChange={onChangeViewMode}
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
        sx={{
          color: "#b0b0b0",
          mb: "12px",
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
          mb: "12px",
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
        sx={{ mb: "10px", textAlign: "center", fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}
      >
        {viewMode === "quarterly" ? "Omsättning per kvartal" : "Omsättning per helår"}
      </Typography>

      {viewMode === "quarterly" && latestQuarter?.growth != null && (
        <>
          <Typography
            variant="body2"
            color={
              Number(latestQuarter.growth) > 0
                ? "#00e676"
                : Number(latestQuarter.growth) < 0
                ? "#ff1744"
                : "#b0b0b0"
            }
            sx={{ mb: "6px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
          >
            {Number(latestQuarter.growth) > 0 ? "Ökning" : Number(latestQuarter.growth) < 0 ? "Minskning" : "Oförändrat"}
            {` jämfört med ${latestQuarter.year - 1} ${latestQuarter.quarter}: ${latestQuarter.growth}%`}
          </Typography>
          {latestQuarter?.value != null && (
            <Typography
              variant="body2"
              sx={{ mb: "10px", textAlign: "center", color: "#b0b0b0", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
            >
              {`Senaste omsättning: ${Math.round(Number(latestQuarter.value)).toLocaleString("sv-SE")} Meuro`}
            </Typography>
          )}
        </>
      )}

      {viewMode === "yearly" && ytdCompare && (
        <Box sx={{ mb: 1.5, textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{
              color: (ytdCompare.growth ?? 0) >= 0 ? "#00e676" : "#ff1744",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
              fontWeight: 600,
            }}
          >
            {ytdCompare.label}:{" "}
            {ytdCompare.growth == null
              ? "—"
              : (ytdCompare.growth >= 0 ? "+" : "") + ytdCompare.growth.toFixed(1) + "%"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#b0b0b0", mt: 0.5, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
          >
            {(() => {
              const fmt = (v) => v.toLocaleString("sv-SE");
              return ytdCompare.prevYTD != null
                ? `${fmt(Math.round(ytdCompare.curYTD))} Meuro vs ${fmt(Math.round(ytdCompare.prevYTD))} Meuro`
                : `${fmt(Math.round(ytdCompare.curYTD))} Meuro`;
            })()}
          </Typography>
        </Box>
      )}

      {viewMode === "quarterly" && latestQuarterYoY != null && (
        <Typography
          variant="caption"
          sx={{ color: latestQuarterYoY >= 0 ? "#9be7a7" : "#ff8a80", mb: 1, display: "block", fontWeight: 600 }}
        >
          YoY senaste kvartal: {(latestQuarterYoY >= 0 ? "+" : "") + Number(latestQuarterYoY).toFixed(1)}%
        </Typography>
      )}

      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        {chartType === "line" ? (
          // Linjeläge: ComposedChart + Area med gradient
          <ComposedChart
            data={viewMode === "quarterly" ? revenueQuarterlyGrowth : revenueYearlyGrowth}
            margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}
          >
            {/* Gradient endast för linje */}
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
              ticks={viewMode === "quarterly" ? revenueQuarterlyXTicks : revenueYearlyXTicks}
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
              tickFormatter={formatRevenueTick}
              width={isMobile ? 48 : 64}
              domain={
                viewMode === "quarterly"
                  ? revenueQuarterlyYConfig.domain
                  : revenueYearlyYConfig.domain
              }
              ticks={
                viewMode === "quarterly"
                  ? revenueQuarterlyYConfig.ticks
                  : revenueYearlyYConfig.ticks
              }
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label
                  value="Omsättning (Meuro)"
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
                  value !== null ? `${value.toLocaleString("sv-SE")} Meuro` : "Ingen data",
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

            {/* Transparent area + linje */}
            <Area type="monotone" dataKey="value" fill={`url(#${areaFillId})`} stroke="none" isAnimationActive={false} />
            <Line type="monotone" dataKey="value" stroke="#00e676" strokeWidth={2} dot={{ r: 4, fill: "#00e676" }} activeDot={{ r: 6 }} />
          </ComposedChart>
        ) : (
          // Stapelläge: inga gradients – solida staplar
          <BarChart
            data={viewMode === "quarterly" ? revenueQuarterlyGrowth : revenueYearlyGrowth}
            margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}
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
              tickFormatter={formatRevenueTick}
              width={isMobile ? 48 : 64}
              domain={
                viewMode === "quarterly"
                  ? revenueQuarterlyYConfig.domain
                  : revenueYearlyYConfig.domain
              }
              ticks={
                viewMode === "quarterly"
                  ? revenueQuarterlyYConfig.ticks
                  : revenueYearlyYConfig.ticks
              }
              tick={{ fontSize: isMobile ? 10 : 14 }}
            >
              {!isMobile && (
                <Label
                  value="Omsättning (Meuro)"
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
                  value !== null ? `${value.toLocaleString("sv-SE")} Meuro` : "Ingen data",
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
            <Bar dataKey="value" fill="#00e676" name="Omsättning" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
};

export default RevenueSection;