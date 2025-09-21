"use client";
import React from "react";
import { Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from "@mui/material";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Label, LineChart, Line, BarChart, Bar, Brush } from "recharts";

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
  historicalAverageDailyBuyback,
  averageBuybackPrice,
  sortedData,
  sortConfig,
  onSort,
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" sx={{ overflowX: "hidden" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff", mb: 2, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        Återköpshistorik
      </Typography>

      <Typography variant="body2" color="#fff" sx={{ mb: 1, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
        Genomsnittlig handel per dag: {Math.round(historicalAverageDailyBuyback).toLocaleString()} aktier
      </Typography>
      <Typography variant="body2" color="#fff" sx={{ mb: 2, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
        Genomsnittspris: {averageBuybackPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs value={viewMode} onChange={onChangeViewMode} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          sx={{ color: "#ccc", "& .MuiTab-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "6px 8px", sm: "12px 16px" } } }}
          variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Daglig" value="daily" />
          <Tab label="Veckovis" value="weekly" />
          <Tab label="Månadsvis" value="monthly" />
          <Tab label="Årlig" value="yearly" />
        </Tabs>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs value={chartTypeHistory} onChange={onChangeChartTypeHistory} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          sx={{ color: "#ccc", "& .MuiTab-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "6px 8px", sm: "12px 16px" } } }}
          variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Linje" value="line" />
          <Tab label="Stapel" value="bar" />
        </Tabs>
      </Box>

      <Typography variant="h6" color="#00e676" sx={{ mb: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        {viewMode === "daily" ? "Dagliga återköp" : viewMode === "weekly" ? "Veckovisa återköp" : viewMode === "monthly" ? "Månadsvisa återköp" : "Årliga återköp"}
      </Typography>
      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        {chartTypeHistory === "line" ? (
          <LineChart data={historyChartData} margin={{ top: 10, right: isMobile ? 10 : 20, bottom: isMobile ? 40 : 40, left: isMobile ? 0 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="Datum" stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 40 : 60}>
              {!isMobile && <Label value={viewMode === "daily" ? "Datum" : viewMode === "weekly" ? "Vecka" : viewMode === "monthly" ? "Månad" : "År"} offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </XAxis>
            <YAxis stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} domain={yDomain} tickFormatter={formatYAxisTick} width={isMobile ? 40 : 60} ticks={yTicks}>
              {!isMobile && <Label value="Antal aktier" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </YAxis>
            <Tooltip formatter={(value) => value.toLocaleString("sv-SE")} contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }} />
            <Line type="monotone" dataKey="Antal_aktier" stroke="#00e676" strokeWidth={2} dot={{ r: 4, fill: "#00e676" }} activeDot={{ r: 6 }} />
            {(viewMode === 'daily' || viewMode === 'weekly') && !isMobile && (
              <Brush dataKey="Datum" height={20} stroke="#666" travellerWidth={8} />
            )}
          </LineChart>
        ) : (
          <BarChart data={historyChartData} margin={{ top: 10, right: isMobile ? 10 : 20, bottom: isMobile ? 40 : 40, left: isMobile ? 0 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="Datum" stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 40 : 60}>
              {!isMobile && <Label value={viewMode === "daily" ? "Datum" : viewMode === "weekly" ? "Vecka" : viewMode === "monthly" ? "Månad" : "År"} offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </XAxis>
            <YAxis stroke="#ccc" tick={{ fontSize: { xs: 12, sm: 14 } }} domain={yDomain} tickFormatter={formatYAxisTick} width={isMobile ? 40 : 60} ticks={yTicks}>
              {!isMobile && <Label value="Antal aktier" angle={-90} offset={-10} position="insideLeft" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />}
            </YAxis>
            <Tooltip formatter={(value) => value.toLocaleString("sv-SE")} contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }} />
            <Bar dataKey="Antal_aktier" fill="#00e676" name="Antal aktier" />
            {(viewMode === 'daily' || viewMode === 'weekly') && !isMobile && (
              <Brush dataKey="Datum" height={20} stroke="#666" travellerWidth={8} />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>

      <Typography variant="h6" color="#00e676" sx={{ mt: 2, mb: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
        Transaktioner
      </Typography>
      <Box sx={{ overflowX: "auto", width: "100%" }}>
        <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
          <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "10px", minWidth: isMobile ? "450px" : "auto" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#fff", textAlign: "center", cursor: "pointer" }} onClick={() => onSort("Datum")}>
                  Datum {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell sx={{ color: "#fff", textAlign: "center", cursor: "pointer" }} onClick={() => onSort("Antal_aktier")}>
                  Antal aktier {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell sx={{ color: "#fff", textAlign: "center", cursor: "pointer" }} onClick={() => onSort("Transaktionsvärde")}>
                  Transaktionsvärde (SEK) {sortConfig.key === "Transaktionsvärde" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Datum}</TableCell>
                  <TableCell sx={{ color: item.Antal_aktier < 0 ? "#FF6F61" : "#fff", textAlign: "center" }}>{item.Antal_aktier.toLocaleString()}</TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Transaktionsvärde ? item.Transaktionsvärde.toLocaleString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default HistoryView;
