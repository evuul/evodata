'use client';
import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Hjälpfunktion för att bestämma kvartal baserat på datum
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return "Q1";
  if (month >= 4 && month <= 6) return "Q2";
  if (month >= 7 && month <= 9) return "Q3";
  return "Q4";
};

// Hjälpfunktion för att summera genomsnittliga spelare per kvartal
const calculateQuarterlyPlayers = (playersData) => {
  if (!playersData || !Array.isArray(playersData)) return {};

  const quarterlyData = {};
  playersData.forEach((item) => {
    const date = new Date(item.Datum);
    if (isNaN(date)) return;

    const year = date.getFullYear();
    const quarter = getQuarter(date);
    const key = `${year} ${quarter}`;

    if (!quarterlyData[key]) {
      quarterlyData[key] = { players: [], count: 0, dates: [] };
    }
    quarterlyData[key].players.push(Number(item.Players) || 0);
    quarterlyData[key].count += 1;
    quarterlyData[key].dates.push(item.Datum);
  });

  return Object.keys(quarterlyData).reduce((acc, key) => {
    const players = quarterlyData[key].players;
    const avgPlayers = players.length > 0
      ? Math.round(players.reduce((sum, val) => sum + val, 0) / players.length)
      : 0;
    acc[key] = { avgPlayers, dates: quarterlyData[key].dates };
    return acc;
  }, {});
};

// Komponenten
const IntelligenceIncomeReport = ({ financialReports, averagePlayersData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Aktuellt datum (dynamiskt)
  const currentDate = new Date();
  const q2Start = new Date("2025-04-01");
  const q2End = new Date("2025-06-30");

  // Formatera Q2-rapporteringsdatum för visning
  const q2ReportDate = new Date("2025-07-17");
  const q2ReportDateFormatted = q2ReportDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

  // Beräkna antal dagar och procent för Q2 2025
  const getQuarterProgress = () => {
    const totalDays = 91; // Hårdkodat till 91 dagar för Q2 2025
    const elapsedDays = Math.ceil((currentDate - q2Start) / (1000 * 60 * 60 * 24)); // Inkluderar startdagen
    const progressPercent = Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100);
    return { elapsedDays, totalDays, progressPercent };
  };

  const { elapsedDays, totalDays, progressPercent } = getQuarterProgress();

  // Bearbeta genomsnittliga spelare per kvartal
  const quarterlyPlayers = useMemo(() => calculateQuarterlyPlayers(averagePlayersData), [averagePlayersData]);

  // Bearbeta liveCasino-data från financialReports
  const revenueData = useMemo(() => {
    if (!financialReports || !financialReports.financialReports || !Array.isArray(financialReports.financialReports)) {
      return {};
    }

    const data = {};
    financialReports.financialReports.forEach((report) => {
      const key = `${report.year} ${report.quarter}`;
      data[key] = Number(report.liveCasino); // Använd liveCasino, redan i M€
    });
    return data;
  }, [financialReports]);

  // Skapa tabelldata för Q1 2025 och Q2 2025
  const tableData = useMemo(() => {
    const periods = ["2025 Q1", "2025 Q2"];
    const q1Revenue = revenueData["2025 Q1"] || 0; // Använd liveCasino-värdet
    const q1AvgPlayers = quarterlyPlayers["2025 Q1"]?.avgPlayers || 0;

    return periods.map((period) => {
      const { avgPlayers, dates } = quarterlyPlayers[period] || { avgPlayers: 0, dates: [] };
      const faktisk = revenueData[period] || null;

      // Uppskatta omsättning baserat på Q1:s liveCasino per spelare
      const uppskattad = period === "2025 Q1" || q1AvgPlayers === 0 || q1Revenue === 0
        ? null
        : Math.round((q1Revenue / q1AvgPlayers) * avgPlayers * 10) / 10;

      // Beräkna skillnad
      const skillnad = faktisk !== null && uppskattad !== null
        ? ((uppskattad - faktisk) / faktisk * 100).toFixed(2)
        : uppskattad !== null && faktisk === null
          ? ((uppskattad - q1Revenue) / q1Revenue * 100).toFixed(2)
          : null;

      return {
        period: period.replace("2025 ", ""),
        avgPlayers,
        uppskattad,
        faktisk,
        skillnad,
        isCurrent: period === "2025 Q2",
        dates,
      };
    });
  }, [quarterlyPlayers, revenueData]);

  // Data för graf (endast Q2 2025 hittills)
  const q2Data = useMemo(() => {
    if (!quarterlyPlayers["2025 Q2"] || !quarterlyPlayers["2025 Q2"].dates || quarterlyPlayers["2025 Q2"].dates.length === 0) {
      return [];
    }
    return averagePlayersData
      .filter((item) => {
        const date = new Date(item.Datum);
        return !isNaN(date) && date.getFullYear() === 2025 && getQuarter(date) === "Q2";
      })
      .map((item) => ({
        date: item.Datum,
        players: Number(item.Players) || 0,
      }));
  }, [averagePlayersData, quarterlyPlayers]);

  // Beräkna preliminära nyckeltal för Q2 2025
  const q2Preliminary = useMemo(() => {
    if (!q2Data.length) {
      const q1Revenue = revenueData["2025 Q1"] || 0;
      const q1AvgPlayers = quarterlyPlayers["2025 Q1"]?.avgPlayers || 0;
      const avgPlayers = 0; // Ingen data än
      const estimatedRevenue = q1AvgPlayers && q1Revenue ? Math.round((q1Revenue / q1AvgPlayers) * avgPlayers * 10) / 10 : 0;
      const changePercent = q1Revenue && estimatedRevenue ? ((estimatedRevenue - q1Revenue) / q1Revenue * 100).toFixed(2) : 0;
      return { avgPlayers, estimatedRevenue, changePercent, revenueSoFar: 0 };
    }
    const avgPlayers = Math.round(q2Data.reduce((sum, item) => sum + item.players, 0) / q2Data.length);
    const q1Revenue = revenueData["2025 Q1"] || 0; // Använd liveCasino-värdet
    const q1AvgPlayers = quarterlyPlayers["2025 Q1"]?.avgPlayers || 0;
    const estimatedRevenue = q1AvgPlayers && q1Revenue ? Math.round((q1Revenue / q1AvgPlayers) * avgPlayers * 10) / 10 : 0;
    const changePercent = q1Revenue && estimatedRevenue ? ((estimatedRevenue - q1Revenue) / q1Revenue * 100).toFixed(2) : 0;
    // Uppskattad intäkt hittills, skalar med progress
    const revenueSoFar = q1AvgPlayers && q1Revenue && avgPlayers
      ? Math.round((estimatedRevenue * (elapsedDays / totalDays)) * 10) / 10
      : 0;
    return { avgPlayers, estimatedRevenue, changePercent, revenueSoFar };
  }, [q2Data, revenueData, quarterlyPlayers, elapsedDays, totalDays]);

  // Beräkna trendtext baserat på uppskattad förändring
  const getTrendText = () => {
    const q1Revenue = revenueData["2025 Q1"] || 0;
    const q2Estimated = q2Preliminary.estimatedRevenue || 0;
    const changeAmount = q2Estimated - q1Revenue;
    const changePercent = q2Preliminary.changePercent || 0;

    if (changePercent > 2) {
      return `Vi är på god väg att öka vår omsättning med ${changeAmount.toLocaleString()} Meuro (+${changePercent}%)!`;
    } else if (changePercent < -2) {
      return `Varning: Vi riskerar att minska omsättningen med ${Math.abs(changeAmount).toLocaleString()} Meuro (${changePercent}%)!`;
    } else {
      return `Vi verkar hålla oss på samma nivå som Q1 2025 (±${changePercent}%)!`;
    }
  };

  const trendText = getTrendText();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: { xs: "12px", sm: "16px" },
        margin: "16px auto",
        width: { xs: "92%", sm: "85%", md: "75%" },
        maxWidth: "1200px",
        minHeight: "200px",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      {/* Preliminära nyckeltal utan svart ruta */}
      <Box sx={{ textAlign: "center", marginBottom: "20px", width: "100%" }}>
        <Typography
          variant="h6"
          sx={{
            color: "#00e676",
            fontWeight: 700,
            fontSize: { xs: "1.2rem", sm: "1.5rem" },
            mb: 1,
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Preliminära Nyckeltal (Q2 2025)
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Genomsnittliga Spelare: <span style={{ color: "#00e676" }}>{q2Preliminary.avgPlayers.toLocaleString()}</span> (hittills)
        </Typography>
        <Typography sx={{ color: "#FFCA28", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Omsättning: <span style={{ color: "#FFCA28" }}>{q2Preliminary.estimatedRevenue.toLocaleString()} €M</span>
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Förändring från Q1: <span style={{ color: q2Preliminary.changePercent >= 0 ? "#00e676" : "#FF6F61" }}>
            {q2Preliminary.changePercent}% ({q2Preliminary.changePercent >= 0 ? "+" : ""})
          </span>
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Intäkt Hittills: <span style={{ color: "#00e676" }}>{q2Preliminary.revenueSoFar.toLocaleString()} €M</span>
        </Typography>
      </Box>

      {/* Progressindikator för Q2 2025 som text */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
        <Typography
          variant="h6"
          sx={{
            color: "#ffffff",
            fontWeight: 700,
            fontSize: { xs: "1.2rem", sm: "1.5rem" },
            mb: 1,
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Q2 2025 Progress
        </Typography>
        <Typography
          sx={{
            color: "#e0e0e0",
            fontSize: { xs: "1rem", sm: "1.2rem" },
            fontWeight: 600,
            mb: 1,
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          {elapsedDays}/{totalDays} dagar ({progressPercent}%)
        </Typography>
        <Typography
          sx={{
            color: "#bbb",
            fontSize: { xs: "0.9rem", sm: "1rem" },
            textAlign: "center",
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          av kvartalet har passerat
        </Typography>
      </Box>

      {/* Graf för Q2 2025 */}
      {q2Data.length > 0 && (
        <Box sx={{ marginBottom: "30px", width: "100%", textAlign: "center" }}>
          <Typography
            variant="h6"
            sx={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
              marginBottom: "15px",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Spelaretrend (Q2 2025)
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={q2Data} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#bbb"
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 50 : 30}
                interval="preserveStartEnd"
                tick={{ fontSize: isMobile ? 12 : 14, fill: "#bbb", fontFamily: "'Roboto', sans-serif" }}
                tickCount={4}
                tickMargin={10}
              />
              <YAxis
                stroke="#bbb"
                domain={['auto', 'auto']}
                tick={{ fontSize: isMobile ? 12 : 14, fill: "#bbb", fontFamily: "'Roboto', sans-serif" }}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontFamily: "'Roboto', sans-serif",
                }}
                formatter={(value) => `${value.toLocaleString()} spelare`}
              />
              <Line
                type="monotone"
                dataKey="players"
                stroke="#42A5F5"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#42A5F5", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      <Typography
        variant="h5"
        sx={{
          color: "#ffffff",
          fontWeight: 700,
          fontSize: { xs: "1.4rem", sm: "1.8rem", md: "2rem" },
          marginBottom: "20px",
          fontFamily: "'Roboto', sans-serif",
          textAlign: "center",
        }}
      >
        Gameshow Omsättning vs Faktiska Omsättning
      </Typography>

      <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.9rem", sm: "1rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
              Period
            </TableCell>
            <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.9rem", sm: "1rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
              AVG Spelare
            </TableCell>
            <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.9rem", sm: "1rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
              Uppskattad (€M)
            </TableCell>
            <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.9rem", sm: "1rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
              Faktisk (€M)
            </TableCell>
            <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.9rem", sm: "1rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
              Skillnad (%)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.map((row, index) => (
            <TableRow
              key={index}
              sx={{
                backgroundColor: row.isCurrent ? "rgba(0, 230, 118, 0.05)" : "transparent",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                transition: "background-color 0.3s ease",
              }}
            >
              <TableCell sx={{ color: "#e0e0e0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                {row.period} {row.isCurrent && <span style={{ color: "#00e676" }}>• Live</span>}
              </TableCell>
              <TableCell sx={{ color: "#e0e0e0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                {row.avgPlayers.toLocaleString()}
              </TableCell>
              <TableCell sx={{ color: "#FFCA28", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                {row.uppskattad?.toLocaleString() || "-"}
              </TableCell>
              <TableCell sx={{ color: "#00e676", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                {row.faktisk?.toLocaleString() || `Kommer ${q2ReportDateFormatted}!`}
              </TableCell>
              <TableCell sx={{ color: row.skillnad !== null ? (row.skillnad > 0 ? "#00e676" : "#FF6F61") : "#e0e0e0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                {row.skillnad !== null ? `${row.skillnad}%` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Trendtext baserat på uppskattning */}
      <Typography
        sx={{
          color: trendText.includes("Varning") ? "#FF6F61" : trendText.includes("god väg") ? "#00e676" : "#e0e0e0",
          fontSize: { xs: "0.9rem", sm: "1rem" },
          marginTop: "15px",
          textAlign: "center",
          fontStyle: "italic",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        {trendText}
      </Typography>
    </Box>
  );
};

export default IntelligenceIncomeReport;