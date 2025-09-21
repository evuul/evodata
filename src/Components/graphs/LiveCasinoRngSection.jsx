"use client";
import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Label, Legend, BarChart, Bar } from "recharts";

const LiveCasinoRngSection = ({
  isMobile,
  viewMode,
  onChangeViewMode,
  liveCasinoRngQuarterlyGrowth,
  liveCasinoRngYearlyGrowth,
  quarterlyTicks,
  yearlyTicks,
  liveCasinoRngQuarterlyYConfig,
  liveCasinoRngYearlyYConfig,
  formatLiveCasinoRngTick,
}) => {
  const latestQuarter = (() => {
    const valid = (liveCasinoRngQuarterlyGrowth || []).filter((i) => i.liveCasino != null && i.rng != null);
    return valid[valid.length - 1];
  })();

  const latestYear = (liveCasinoRngYearlyGrowth || [])[liveCasinoRngYearlyGrowth.length - 1];

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff", marginBottom: "12px", textAlign: "center", fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" }, letterSpacing: "0.5px" }}>
        <span style={{ color: "#00e676" }}>LiveCasino</span>{" "}
        <span style={{ color: "#b0b0b0" }}>vs</span>{" "}
        <span style={{ color: "#ffffff" }}>RNG</span>
      </Typography>

      <Tabs value={viewMode} onChange={onChangeViewMode} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }} sx={{ color: "#b0b0b0", marginBottom: "12px", "& .MuiTab-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "6px 8px", sm: "12px 16px" } } }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
        <Tab label="Per kvartal" value="quarterly" />
        <Tab label="Per helår" value="yearly" />
      </Tabs>

      <Typography variant="h6" color="#ffffff" sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        {viewMode === "quarterly" ? "Intäkter per kvartal" : "Intäkter per helår"}
      </Typography>

      {viewMode === "quarterly" && latestQuarter && (
        <>
          {latestQuarter.liveCasinoGrowth && (
            <Typography variant="body2" color={latestQuarter.liveCasinoGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ marginBottom: "5px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
              LiveCasino ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.liveCasinoGrowth}%
            </Typography>
          )}
          {latestQuarter.rngGrowth && (
            <Typography variant="body2" color={latestQuarter.rngGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
              RNG ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.rngGrowth}%
            </Typography>
          )}
        </>
      )}

      {viewMode === "yearly" && latestYear && (
        <>
          {latestYear.liveCasinoGrowth && (
            <Typography variant="body2" color={latestYear.liveCasinoGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ marginBottom: "5px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
              LiveCasino tillväxt jämfört med {latestYear.year - 1}: {latestYear.liveCasinoGrowth}%
            </Typography>
          )}
          {latestYear.rngGrowth && (
            <Typography variant="body2" color={latestYear.rngGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
              RNG tillväxt jämfört med {latestYear.year - 1}: {latestYear.rngGrowth}%
            </Typography>
          )}
        </>
      )}

      <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
        <BarChart data={viewMode === "quarterly" ? liveCasinoRngQuarterlyGrowth : liveCasinoRngYearlyGrowth} margin={{ top: 16, right: 12, bottom: isMobile ? 48 : 24, left: isMobile ? 16 : 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#ccc" ticks={viewMode === "quarterly" ? quarterlyTicks : yearlyTicks} interval={0}>
            {!isMobile && <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />}
          </XAxis>
          <YAxis stroke="#ccc" tickFormatter={formatLiveCasinoRngTick} width={isMobile ? 56 : 72} domain={viewMode === "quarterly" ? liveCasinoRngQuarterlyYConfig.domain : liveCasinoRngYearlyYConfig.domain} ticks={viewMode === "quarterly" ? liveCasinoRngQuarterlyYConfig.ticks : liveCasinoRngYearlyYConfig.ticks}>
            {!isMobile && <Label value="Intäkter (Meuro)" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
          </YAxis>
          <Tooltip
            formatter={(value, name, props) => {
              const liveCasinoGrowth = props.payload.liveCasinoGrowth;
              const rngGrowth = props.payload.rngGrowth;
              return [
                value !== null ? `${value.toLocaleString("sv-SE")} Meuro` : "Ingen data",
                name === "LiveCasino" && liveCasinoGrowth
                  ? `Ökning: ${liveCasinoGrowth}%`
                  : name === "RNG" && rngGrowth
                  ? `Ökning: ${rngGrowth}%`
                  : "Ingen jämförelse tillgänglig",
              ];
            }}
            contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="liveCasino" stackId="a" fill="#00e676" name="LiveCasino" />
          <Bar dataKey="rng" stackId="a" fill="#FFCA28" name="RNG" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default LiveCasinoRngSection;
