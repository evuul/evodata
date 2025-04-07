'use client';
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label,
} from "recharts";
import { keyframes } from "@emotion/react";
import oldBuybackData from "../app/data/oldBuybackData.json"; // Importera JSON-filen

// Växelkurs (exempelvärde)
const exchangeRate = 10.83; // Exempel: 1 EUR = 10.83 SEK

// Manuellt angivet pris för att beräkna hur många aktier som kan köpas
const currentSharePrice = 724; // Sätt det aktuella priset här (uppdatera manuellt)

// Animationer för glow-effekt
const pulseGreen = keyframes`
  0% { box-shadow: 0 0 6px rgba(0, 255, 0, 0.3); }
  50% { box-shadow: 0 0 14px rgba(0, 255, 0, 0.8); }
  100% { box-shadow: 0 0 6px rgba(0, 255, 0, 0.3); }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 6px rgba(255, 23, 68, 0.3); }
  50% { box-shadow: 0 0 14px rgba(255, 23, 68, 0.8); }
  100% { box-shadow: 0 0 6px rgba(255, 23, 68, 0.3); }
`;

// Totala aktier över tid (utan att ta hänsyn till indragningar)
const totalSharesData = [
  { date: "2019", totalShares: 181622725 },
  { date: "2020", totalShares: 183927915 },
  { date: "2021", totalShares: 215111115 },
  { date: "2022", totalShares: 213771346 },
  { date: "2023", totalShares: 213566498 },
  { date: "2024", totalShares: 209562751 },
  { date: "2025", totalShares: 209562751 },
];

// Beräkna Evolutions ägande per år baserat på återköp och indragningar
const calculateEvolutionOwnershipPerYear = () => {
  const ownershipByYear = {};
  let cumulativeShares = 0;

  // Gå igenom alla transaktioner (både återköp och indragningar)
  oldBuybackData.forEach((item) => {
    const year = item.Datum.split("-")[0];
    cumulativeShares += item.Antal_aktier; // Hanterar både positiva (återköp) och negativa (indragningar)

    if (!ownershipByYear[year]) {
      ownershipByYear[year] = cumulativeShares;
    } else {
      ownershipByYear[year] = cumulativeShares;
    }
  });

  // Konvertera till array-format för graf och tabell
  const evolutionOwnershipData = Object.keys(ownershipByYear)
    .map((year) => ({
      date: year,
      shares: ownershipByYear[year],
    }))
    .sort((a, b) => a.date - b.date); // Sortera efter år

  return evolutionOwnershipData;
};

// Beräkna totala makulerade aktier (endast för visning som text)
const calculateCancelledShares = () => {
  return oldBuybackData
    .filter((item) => item.Antal_aktier < 0) // Endast indragningar
    .reduce((sum, item) => sum + Math.abs(item.Antal_aktier), 0); // Summera absoluta värden
};

// Beräkna Evolutions ägande och makulerade aktier
const evolutionOwnershipData = calculateEvolutionOwnershipPerYear();
const cancelledShares = calculateCancelledShares();

// Beräkna ägarandel baserat på totala aktier och Evolutions ägande
const ownershipPercentageData = totalSharesData.map((item, index) => {
  const evolutionShares = evolutionOwnershipData.find((data) => data.date === item.date)?.shares || 0;
  return {
    date: item.date,
    percentage: evolutionShares > 0 && item.totalShares > 0 ? (evolutionShares / item.totalShares) * 100 : 0,
  };
});

// Filtrera data för grafer (endast positiva transaktioner, dvs. återköp)
const buybackDataForGraphDaily = oldBuybackData.filter((item) => item.Antal_aktier > 0);

// Beräkna återköp per helår
const buybackDataForGraphYearly = () => {
  const yearlyData = {};
  oldBuybackData
    .filter((item) => item.Antal_aktier > 0) // Endast positiva transaktioner
    .forEach((item) => {
      const year = item.Datum.split("-")[0];
      if (!yearlyData[year]) {
        yearlyData[year] = { Datum: year, Antal_aktier: 0 };
      }
      yearlyData[year].Antal_aktier += item.Antal_aktier;
    });

  return Object.values(yearlyData).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

// Beräkna genomsnittlig handel per dag och genomsnittspris (endast positiva transaktioner)
const calculateAverageDailyBuyback = () => {
  const positiveTransactions = oldBuybackData.filter((item) => item.Antal_aktier > 0); // Endast återköp
  if (positiveTransactions.length === 0) return { averageDaily: 0, averagePrice: 0 };

  // Första och sista datumet för återköp
  const firstDate = new Date(positiveTransactions[0].Datum);
  const today = new Date("2025-04-07"); // Dagens datum (7 april 2025)

  // Beräkna antalet dagar mellan första återköpet och idag
  const timeDifference = today - firstDate;
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Konvertera till dagar

  // Totalt antal återköpta aktier
  const totalSharesBought = positiveTransactions.reduce((sum, item) => sum + item.Antal_aktier, 0);

  // Totalt transaktionsvärde och genomsnittspris
  const totalTransactionValue = positiveTransactions.reduce((sum, item) => sum + item.Transaktionsvärde, 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;

  // Genomsnitt per dag
  const averageDaily = daysDifference > 0 ? totalSharesBought / daysDifference : 0;

  return { averageDaily, averagePrice };
};

const StockBuybackInfo = ({
  isActive,
  buybackCash,
  sharesBought,
  averagePrice = 0,
}) => {
  const [activeTab, setActiveTab] = useState("buyback");
  const [viewMode, setViewMode] = useState("daily"); // "daily" eller "yearly" för återköpsgrafen
  const [sortConfig, setSortConfig] = useState({ key: "Datum", direction: "desc" }); // Sortering för tabellen

  const buybackCashInSEK = buybackCash * exchangeRate;
  const totalBuybackValue = sharesBought * averagePrice;
  const remainingCash = buybackCashInSEK - totalBuybackValue;
  const buybackProgress = (totalBuybackValue / buybackCashInSEK) * 100;
  const remainingSharesToBuy = remainingCash > 0 && currentSharePrice > 0 ? Math.floor(remainingCash / currentSharePrice) : 0;

  // Senaste värden för totala aktier och Evolutions ägande
  const latestTotalShares = totalSharesData[totalSharesData.length - 1].totalShares;
  const latestEvolutionShares = evolutionOwnershipData[evolutionOwnershipData.length - 1]?.shares || 0;
  const latestOwnershipPercentage = (latestEvolutionShares / latestTotalShares) * 100;

  // Beräkna genomsnittlig handel per dag och genomsnittspris
  const { averageDaily: averageDailyBuyback, averagePrice: averageBuybackPrice } = calculateAverageDailyBuyback();

  // Sortera tabellen
  const sortedData = [...oldBuybackData].sort((a, b) => {
    const key = sortConfig.key;
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    if (key === "Datum") {
      return direction * (new Date(a[key]) - new Date(b[key]));
    } else if (key === "Kommentar") {
      return direction * (a[key] || "").localeCompare(b[key] || "");
    } else {
      return direction * (a[key] - b[key]);
    }
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  const formatYAxisTick = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString("sv-SE");
  };

  const getYDomain = (data, key) => {
    if (!data || data.length === 0) return [0, 1];
    const values = data.map(item => item[key]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const interval = Math.ceil((maxValue - minValue) / 5 / 1000) * 1000; // Intervall på 1000 aktier
    const lowerBound = Math.floor(minValue / interval) * interval;
    const upperBound = Math.ceil(maxValue / interval) * interval;
    return [lowerBound, upperBound];
  };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: "25px",
        margin: "20px auto",
        width: { xs: "90%", sm: "80%", md: "70%" },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        centered
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
        sx={{ color: "#ccc", marginBottom: "20px" }}
      >
        <Tab label="Återköpsstatus" value="buyback" />
        <Tab label="Evolutions ägande" value="ownership" />
        <Tab label="Totala aktier" value="totalShares" />
        <Tab label="Återköpshistorik" value="history" />
      </Tabs>

      {/* Tab 1: Återköpsstatus */}
      {activeTab === "buyback" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: isActive ? "#00e676" : "#ff1744",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Status på återköp: {isActive ? "Aktivt" : "Inaktivt"}
          </Typography>

          {/* Progress Bar */}
          <Box sx={{ width: "100%", marginBottom: "20px", position: "relative" }}>
            <LinearProgress
              variant="determinate"
              value={buybackProgress}
              sx={{
                height: "15px",
                borderRadius: "10px",
                backgroundColor: "#f1f1f1",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: isActive ? "#00e676" : "#ff1744",
                },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "15px",
                width: `${buybackProgress}%`,
                borderRadius: "10px",
                animation: `${isActive ? pulseGreen : pulseRed} 2s infinite ease-in-out`,
                pointerEvents: "none",
              }}
            />
            <Typography variant="body2" color="#ccc" align="center" sx={{ marginTop: "5px", textAlign: "center" }}>
              {Math.floor(buybackProgress)}% av kassan har använts för återköp
            </Typography>
          </Box>

          {/* Detaljer om återköpen */}
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
              Återköpta aktier: {sharesBought.toLocaleString()}
            </Typography>
            <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
              Snittkurs: {averagePrice ? averagePrice.toLocaleString() : "0"} SEK
            </Typography>
            <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
              Kassa för återköp (i SEK): {buybackCashInSEK.toLocaleString()} SEK
            </Typography>
            <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
              Kvar av kassan: {remainingCash.toLocaleString()} SEK
            </Typography>
            <Typography variant="body1" color="#00e676" sx={{ marginBottom: "5px", textAlign: "center" }}>
              Kvar att köpa för: {remainingSharesToBuy.toLocaleString()} aktier (baserat på {currentSharePrice} SEK/aktie)
            </Typography>
          </Box>
        </Box>
      )}

      {/* Tab 2: Evolutions ägande */}
      {activeTab === "ownership" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00e676",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Evolutions ägande
          </Typography>

          {/* Senaste ägarandel och makulerade aktier */}
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "10px", textAlign: "center" }}>
            Evolution äger: {latestEvolutionShares.toLocaleString()} aktier
          </Typography>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "10px", textAlign: "center" }}>
            Ägarandel: {latestOwnershipPercentage.toFixed(2)}%
          </Typography>
          {cancelledShares > 0 && (
            <Typography variant="body1" color="#FF6F61" sx={{ marginBottom: "20px", textAlign: "center" }}>
              Makulerade aktier: {cancelledShares.toLocaleString()}
            </Typography>
          )}

          {/* Graf för antal aktier över tid */}
          <Typography variant="h6" color="#ccc" sx={{ marginTop: "20px", marginBottom: "10px", textAlign: "center" }}>
            Antal aktier över tid
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolutionOwnershipData} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value="År" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis stroke="#ccc" domain={getYDomain(evolutionOwnershipData, "shares")} tickFormatter={formatYAxisTick}>
                <Label value="Antal aktier" angle={-90} offset={-30} position="insideLeft" fill="#ccc" />
              </YAxis>
              <Tooltip
                formatter={(value) => value.toLocaleString("sv-SE")}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="shares"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Tabell för historiska data */}
          <Typography variant="h6" color="#ccc" sx={{ marginTop: "20px", marginBottom: "10px", textAlign: "center" }}>
            Historisk data
          </Typography>
          <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", overflow: "hidden" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#ccc", textAlign: "center" }}>År</TableCell>
                <TableCell sx={{ color: "#ccc", textAlign: "center" }}>Evolutions aktier</TableCell>
                <TableCell sx={{ color: "#ccc", textAlign: "center" }}>Ägarandel (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evolutionOwnershipData.map((item, index) => (
                <TableRow key={item.date}>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.date}</TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.shares.toLocaleString()}</TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>
                    {ownershipPercentageData.find((data) => data.date === item.date)?.percentage.toFixed(2) || "0.00"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Tab 3: Totala aktier */}
      {activeTab === "totalShares" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00e676",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Totala aktier
          </Typography>

          {/* Senaste totala aktier */}
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "20px", textAlign: "center" }}>
            Totalt antal aktier: {latestTotalShares.toLocaleString()}
          </Typography>

          {/* Graf för totala aktier över tid */}
          <Typography variant="h6" color="#ccc" sx={{ marginBottom: "10px", textAlign: "center" }}>
            Totala aktier över tid
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={totalSharesData} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis stroke="#ccc" domain={getYDomain(totalSharesData, "totalShares")} tickFormatter={formatYAxisTick}>
                <Label value="Antal aktier" angle={-90} offset={-30} position="insideLeft" fill="#ccc" />
              </YAxis>
              <Tooltip
                formatter={(value) => value.toLocaleString("sv-SE")}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="totalShares"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Tabell för historiska data */}
          <Typography variant="h6" color="#ccc" sx={{ marginTop: "20px", marginBottom: "10px", textAlign: "center" }}>
            Historisk data
          </Typography>
          <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", overflow: "hidden" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#ccc", textAlign: "center" }}>År</TableCell>
                <TableCell sx={{ color: "#ccc", textAlign: "center" }}>Totala aktier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {totalSharesData.map((item) => (
                <TableRow key={item.date}>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.date}</TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.totalShares.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Tab 4: Återköpshistorik */}
      {activeTab === "history" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00e676",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Återköpshistorik
          </Typography>

          {/* Genomsnittlig handel per dag och genomsnittspris */}
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "10px", textAlign: "center" }}>
            Genomsnittlig handel per dag: {Math.round(averageDailyBuyback).toLocaleString()} aktier
          </Typography>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "20px", textAlign: "center" }}>
            Genomsnittspris: {averageBuybackPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
          </Typography>

          {/* Växla mellan dag och helår */}
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            centered
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{ color: "#ccc", marginBottom: "20px" }}
          >
            <Tab label="Per dag" value="daily" />
            <Tab label="Per helår" value="yearly" />
          </Tabs>

          {/* Graf för återköpta aktier över tid */}
          <Typography variant="h6" color="#ccc" sx={{ marginBottom: "10px", textAlign: "center" }}>
            Återköpta aktier över tid
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={viewMode === "daily" ? buybackDataForGraphDaily : buybackDataForGraphYearly()}
              margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="Datum" stroke="#ccc">
                <Label value={viewMode === "daily" ? "Datum" : "År"} offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis stroke="#ccc" domain={getYDomain(viewMode === "daily" ? buybackDataForGraphDaily : buybackDataForGraphYearly(), "Antal_aktier")} tickFormatter={formatYAxisTick}>
                <Label value="Antal aktier" angle={-90} offset={-30} position="insideLeft" fill="#ccc" />
              </YAxis>
              <Tooltip
                formatter={(value) => value.toLocaleString("sv-SE")}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="Antal_aktier"
                stroke="#4CAF50"
                strokeWidth={2}
                dot={{ r: 4, fill: "#4CAF50" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Tabell för historiska transaktioner (inkluderar både återköp och indragningar) */}
          <Typography variant="h6" color="#ccc" sx={{ marginTop: "20px", marginBottom: "10px", textAlign: "center" }}>
            Historiska transaktioner
          </Typography>
          <TableContainer sx={{ maxHeight: 300, overflowY: "auto", backgroundColor: "#2e2e2e", borderRadius: "8px" }}>
            <Table stickyHeader sx={{ backgroundColor: "#2e2e2e" }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ color: "#ccc", textAlign: "center", backgroundColor: "#2e2e2e", cursor: "pointer" }}
                    onClick={() => handleSort("Datum")}
                  >
                    Datum {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </TableCell>
                  <TableCell
                    sx={{ color: "#ccc", textAlign: "center", backgroundColor: "#2e2e2e", cursor: "pointer" }}
                    onClick={() => handleSort("Antal_aktier")}
                  >
                    Antal aktier {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </TableCell>
                  <TableCell
                    sx={{ color: "#ccc", textAlign: "center", backgroundColor: "#2e2e2e", cursor: "pointer" }}
                    onClick={() => handleSort("Snittkurs")}
                  >
                    Snittkurs (SEK) {sortConfig.key === "Snittkurs" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </TableCell>
                  <TableCell
                    sx={{ color: "#ccc", textAlign: "center", backgroundColor: "#2e2e2e", cursor: "pointer" }}
                    onClick={() => handleSort("Transaktionsvärde")}
                  >
                    Transaktionsvärde (SEK) {sortConfig.key === "Transaktionsvärde" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </TableCell>
                  <TableCell
                    sx={{ color: "#ccc", textAlign: "center", backgroundColor: "#2e2e2e", cursor: "pointer" }}
                    onClick={() => handleSort("Kommentar")}
                  >
                    Kommentar {sortConfig.key === "Kommentar" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((item) => (
                  <TableRow key={item.Datum}>
                    <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Datum}</TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Antal_aktier.toLocaleString()}</TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Snittkurs.toLocaleString()}</TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Transaktionsvärde.toLocaleString()}</TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center" }}>{item.Kommentar || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Card>
  );
};

export default StockBuybackInfo;