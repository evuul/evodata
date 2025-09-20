"use client";
import React from "react";
import { Box, Typography } from "@mui/material";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Label, Bar } from "recharts";

const ReturnsView = ({
  isMobile,
  chartData,
  totalReturns,
  totalDividends,
  totalBuybacks,
  loadingPrice,
  directYieldPercentage,
  marketCap,
  latestYear,
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: "#fff", mb: 2, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}
      >
        Återinvestering till investerare
      </Typography>

      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ color: "#FFCA28", fontWeight: "bold", fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" } }}>
          Total återinvestering: {(totalReturns / 1000000).toLocaleString("sv-SE")} Mkr
        </Typography>
        <Typography variant="body2" sx={{ color: "#ccc", mt: 1, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
          (Utdelningar: {(totalDividends / 1000000).toLocaleString("sv-SE")} Mkr, Aktieåterköp: {(totalBuybacks / 1000000).toLocaleString("sv-SE")} Mkr)
        </Typography>
        {loadingPrice ? (
          <Typography variant="body2" sx={{ color: "#ccc", mt: 1, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
            Laddar direktavkastning...
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: "#00e676", mt: 1, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
            Direktavkastning ({latestYear}): {directYieldPercentage.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% av marknadsvärdet ({(marketCap / 1000000000).toLocaleString("sv-SE")} Mdkr)
          </Typography>
        )}
      </Box>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
          <BarChart data={chartData} margin={{ top: 50, right: 20, left: isMobile ? -20 : 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="year" stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} height={isMobile ? 30 : 40}>
              {!isMobile && <Label value="År" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </XAxis>
            <YAxis stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} tickFormatter={(v) => `${v.toLocaleString("sv-SE")} Mkr`} width={isMobile ? 40 : 60}>
              {!isMobile && <Label value="Belopp (Mkr)" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </YAxis>
            <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} labelStyle={{ color: "#ccc" }} itemStyle={{ color: "#ccc" }} formatter={(value) => `${value.toLocaleString("sv-SE")} Mkr`} />
            <Legend verticalAlign="top" wrapperStyle={{ color: "#ccc", marginBottom: 20 }} />
            <Bar dataKey="dividends" fill="#00e676" name="UTD" />
            <Bar dataKey="buybacks" fill="#FFCA28" name="Aktieåterköp" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" sx={{ color: "#ccc", mb: 2, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
          Laddar data...
        </Typography>
      )}
    </Box>
  );
};

export default ReturnsView;

