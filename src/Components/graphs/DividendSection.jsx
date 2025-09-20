"use client";
import React from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Label, LineChart, Line, Legend } from "recharts";

const DividendSection = ({
  isMobile,
  priceError,
  loadingPrice,
  lastUpdated,
  latestHistorical,
  dividendGrowth,
  planned,
  plannedYield,
  currentSharePrice,
  combinedDividendData,
  formatDividendTick,
  formatDividendYieldTick,
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff", marginBottom: "12px", textAlign: "center", fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" }, letterSpacing: "0.5px" }}>
        Utdelning
      </Typography>

      <Box sx={{ textAlign: "center", marginBottom: "12px" }}>
        {priceError && (
          <Typography variant="body2" color="#ff1744" sx={{ marginBottom: "8px", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}> {priceError} </Typography>
        )}
        {loadingPrice ? (
          <Typography variant="body2" color="#b0b0b0" sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}> Laddar aktiepris... </Typography>
        ) : (
          <>
            {lastUpdated && (
              <Typography variant="body2" color="#b0b0b0" sx={{ marginBottom: "8px", fontSize: { xs: "0.85rem", sm: "0.95rem" } }} />
            )}
            {latestHistorical && (
              <>
                <Typography variant="body1" color="#ffffff" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Senaste utdelning: {latestHistorical.dividendPerShare.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
                </Typography>
                <Typography variant="body1" color="#ffffff" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Direktavkastning: {(latestHistorical.dividendYield || 0).toFixed(2)}% (baserat på aktiekurs {latestHistorical.sharePriceAtDividend} SEK)
                </Typography>
              </>
            )}
            {dividendGrowth && (
              <>
                <Typography variant="body2" color={dividendGrowth.dividendGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ marginTop: "8px", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
                  Ökning av utdelning ({dividendGrowth.latestDate} vs {dividendGrowth.previousDate}): {dividendGrowth.dividendGrowth}%
                </Typography>
                <Typography variant="body2" color={dividendGrowth.yieldGrowth >= 0 ? "#00e676" : "#ff1744"} sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
                  Ökning av direktavkastning: {dividendGrowth.yieldGrowth}%
                </Typography>
              </>
            )}
            {planned.length > 0 && (
              <>
                <Typography variant="body1" color="#FFD700" sx={{ marginTop: "8px", fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Kommande utdelning:
                </Typography>
                <Typography variant="body1" color="#FFD700" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  X-dag: {planned[0].exDate} | Utdelningsdag: {planned[0].date} | Planerad utdelning: {planned[0].dividendPerShare.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK | Direktavkastning: {plannedYield.toFixed(2)}% (baserat på nuvarande kurs {currentSharePrice ? currentSharePrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A"} SEK)
                </Typography>
              </>
            )}
          </>
        )}
      </Box>

      <Typography variant="h6" color="#ffffff" sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        Utdelning över tid
      </Typography>
      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        <LineChart data={combinedDividendData} margin={{ top: 20, right: isMobile ? 20 : 40, bottom: 20, left: isMobile ? 10 : 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#ccc"> {!isMobile && <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />} </XAxis>
          <YAxis yAxisId="left" stroke="#ccc" tickFormatter={formatDividendTick} width={isMobile ? 30 : 60} tick={{ fontSize: isMobile ? 10 : 14 }}>
            {!isMobile && <Label value="Utdelning (SEK)" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
          </YAxis>
          <YAxis yAxisId="right" orientation="right" stroke="#ccc" tickFormatter={formatDividendYieldTick} width={isMobile ? 30 : 60} tick={{ fontSize: isMobile ? 10 : 14 }}>
            {!isMobile && <Label value="Direktavkastning (%)" angle={90} offset={-10} position="insideRight" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
          </YAxis>
          <Tooltip
            formatter={(value, name) => [
              name === "Utdelning (SEK)" ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK` : `${value.toFixed(2)}%`,
              name === "Utdelning (SEK)" ? "Utdelning per aktie" : "Direktavkastning",
            ]}
            contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
          />
          <Line yAxisId="left" type="monotone" dataKey="dividendPerShare" stroke="#00e676" strokeWidth={2} dot={{ r: 4, fill: "#00e676" }} activeDot={{ r: 6 }} name="Utdelning (SEK)" />
          <Line yAxisId="right" type="monotone" dataKey="dividendYield" stroke="#FFCA28" strokeWidth={2} dot={{ r: 4, fill: "#FFCA28" }} activeDot={{ r: 6 }} name="Direktavkastning (%)" />
          <Legend verticalAlign="top" height={36} />
        </LineChart>
      </ResponsiveContainer>

      <Typography variant="h6" color="#ffffff" sx={{ marginTop: "12px", marginBottom: "10px", textAlign: "center", fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        Historiska och planerade utdelningar
      </Typography>
      <Box sx={{ overflowX: "auto", width: "100%" }}>
        <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "450px" : "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "#b0b0b0", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>Datum</TableCell>
              <TableCell sx={{ color: "#b0b0b0", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>Utdelning per aktie (SEK)</TableCell>
              <TableCell sx={{ color: "#b0b0b0", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>Direktavkastning (%)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {combinedDividendData.map((item) => (
              <TableRow key={item.date}>
                <TableCell sx={{ color: "#ffffff", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>{item.date}</TableCell>
                <TableCell sx={{ color: "#ffffff", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>{item.dividendPerShare.toLocaleString()}</TableCell>
                <TableCell sx={{ color: "#ffffff", textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>{item.dividendYield.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default DividendSection;

