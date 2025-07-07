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

// Hjälpfunktion för att få start- och slutdatum för ett givet kvartal och år
const getQuarterDates = (year, quarter) => {
  const startMonth = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 }[quarter];
  const endMonth = startMonth + 2;
  return {
    start: new Date(`${year}-${startMonth}-01`),
    end: new Date(`${year}-${endMonth}-30`),
  };
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
  const currentDate = new Date(); // Nu 01:09 PM CEST, 2025-07-07
  const currentYear = currentDate.getFullYear();
  const currentQuarter = getQuarter(currentDate);

  // Bestäm de tre senaste kvartalen att visa
  const getRecentQuarters = () => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const currentIndex = quarters.indexOf(currentQuarter);
    const previousIndex = currentIndex === 0 ? 3 : currentIndex - 1;
    const twoBeforeIndex = previousIndex === 0 ? 3 : previousIndex - 1;
    return [
      `${currentYear} ${currentQuarter}`,
      `${currentYear} ${quarters[previousIndex]}`,
      `${currentIndex <= 1 ? currentYear : currentYear - 1} ${quarters[twoBeforeIndex]}`,
    ];
  };

  const [currentPeriod, previousPeriod, twoBeforePeriod] = getRecentQuarters();

  // Formatera rapportdatum för visning baserat på specifikt kvartal
  const getReportDate = (quarter, year) => {
    const reportMonth = { Q1: 4, Q2: 7, Q3: 10, Q4: 1 }[quarter];
    const reportYear = quarter === "Q4" ? year + 1 : year;
    return new Date(`${reportYear}-${reportMonth}-17`);
  };
  const reportDate = getReportDate(currentQuarter, currentYear);
  const reportDateFormatted = reportDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

  // Beräkna antal dagar och procent för aktuellt kvartal
  const getQuarterProgress = () => {
    const { start, end } = getQuarterDates(currentYear, currentQuarter);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Inkluderar start- och slutdag
    let elapsedDays = Math.floor((currentDate - start) / (1000 * 60 * 60 * 24)); // Antal fulla dagar sedan start
    if (currentDate > start) {
      elapsedDays += 1; // Lägg till dagens dag som en passerad dag
    }
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
      data[key] = Number(report.liveCasino) || 0; // Fallback till 0 om värdet saknas
    });
    return data;
  }, [financialReports]);

  // Beräkna omsättning per spelare för Q2
  const q2RevenuePerPlayer = 423.7 / 65769; // 0.00644 M€ per spelare ≈ 6 440 € per spelare

  // Skapa tabelldata för Q1, Q2 och Q3
  const tableData = useMemo(() => {
    return [twoBeforePeriod, previousPeriod, currentPeriod].map((period) => {
      const year = period.split(" ")[0];
      const quarter = period.split(" ")[1];
      const { avgPlayers, dates } = quarterlyPlayers[period] || { avgPlayers: 0, dates: [] };
      const faktisk = revenueData[period] || null;

      // Använd explicit 65 769 för Q2 om det är previousPeriod
      let customAvgPlayers = avgPlayers;
      if (period === previousPeriod) customAvgPlayers = 65769; // Hårdkodat värde för Q2

      // Uppskatta omsättning baserat på Q2:s omsättning per spelare
      let upskattad;
      if (period === previousPeriod) {
        upskattad = 423.7; // Hårdkodat värde för Q2
      } else {
        upskattad = customAvgPlayers > 0 ? Math.round(q2RevenuePerPlayer * customAvgPlayers * 10) / 10 : null;
      }

      // Beräkna skillnad endast om faktisk data finns
      const skillnad = faktisk !== null && upskattad !== null
        ? ((upskattad - faktisk) / faktisk * 100).toFixed(2)
        : null;

      return {
        period: quarter,
        avgPlayers: customAvgPlayers,
        upskattad,
        faktisk,
        skillnad,
        isCurrent: period === currentPeriod,
        dates,
      };
    });
  }, [quarterlyPlayers, revenueData, currentPeriod, previousPeriod, twoBeforePeriod, q2RevenuePerPlayer]);

  // Data för graf (endast aktuellt kvartal hittills)
  const qData = useMemo(() => {
    if (!quarterlyPlayers[currentPeriod] || !quarterlyPlayers[currentPeriod].dates || quarterlyPlayers[currentPeriod].dates.length === 0) {
      return [];
    }
    return averagePlayersData
      .filter((item) => {
        const date = new Date(item.Datum);
        const itemQuarter = getQuarter(date);
        return !isNaN(date) && date.getFullYear() === currentYear && itemQuarter === currentQuarter;
      })
      .map((item) => ({
        date: item.Datum,
        players: Number(item.Players) || 0,
      }));
  }, [averagePlayersData, quarterlyPlayers, currentPeriod, currentYear, currentQuarter]);

  // Beräkna preliminära nyckeltal för aktuellt kvartal
  const preliminary = useMemo(() => {
    if (!qData.length) {
      const q1Revenue = revenueData[previousPeriod] || 0;
      const q1AvgPlayers = quarterlyPlayers[previousPeriod]?.avgPlayers || 0;
      const avgPlayers = 0; // Ingen data än
      const estimatedRevenue = q1AvgPlayers && q1Revenue ? Math.round((q1Revenue / q1AvgPlayers) * avgPlayers * 10) / 10 : 0;
      const changePercent = q1Revenue && estimatedRevenue ? ((estimatedRevenue - q1Revenue) / q1Revenue * 100).toFixed(2) : 0;
      return { avgPlayers, estimatedRevenue, changePercent, revenueSoFar: 0 };
    }
    const avgPlayers = Math.round(qData.reduce((sum, item) => sum + item.players, 0) / qData.length);
    const q1Revenue = revenueData[previousPeriod] || 0;
    const q1AvgPlayers = quarterlyPlayers[previousPeriod]?.avgPlayers || 0;
    const estimatedRevenue = q1AvgPlayers && q1Revenue ? Math.round((q1Revenue / q1AvgPlayers) * avgPlayers * 10) / 10 : Math.round(q2RevenuePerPlayer * avgPlayers * 10) / 10;
    const changePercent = q1Revenue && estimatedRevenue ? ((estimatedRevenue - q1Revenue) / q1Revenue * 100).toFixed(2) : ((estimatedRevenue - 423.7) / 423.7 * 100).toFixed(2);
    const revenueSoFar = q1AvgPlayers && q1Revenue && avgPlayers
      ? Math.round((estimatedRevenue * (elapsedDays / totalDays)) * 10) / 10
      : Math.round((estimatedRevenue * (elapsedDays / totalDays)) * 10) / 10;
    return { avgPlayers, estimatedRevenue, changePercent, revenueSoFar };
  }, [qData, revenueData, quarterlyPlayers, elapsedDays, totalDays, previousPeriod, currentPeriod, q2RevenuePerPlayer]);

  // Beräkna trendtext baserat på uppskattad förändring
  const getTrendText = () => {
    const q1Revenue = revenueData[previousPeriod] || 0;
    const qEstimated = preliminary.estimatedRevenue || 0;
    const changeAmount = qEstimated - q1Revenue;
    const changePercent = preliminary.changePercent || 0;

    if (changePercent > 2) {
      return `Vi är på god väg att öka vår omsättning med ${changeAmount.toLocaleString()} Meuro (+${changePercent}%)!`;
    } else if (changePercent < -2) {
      return `Varning: Vi riskerar att minska omsättningen med ${Math.abs(changeAmount).toLocaleString()} Meuro (${changePercent}%)!`;
    } else {
      return `Vi verkar hålla oss på samma nivå som ${previousPeriod.split(" ")[1]} ${previousPeriod.split(" ")[0]} (±${changePercent}%)!`;
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
          Preliminära Nyckeltal ({currentQuarter} {currentYear})
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Genomsnittliga Spelare: <span style={{ color: "#00e676" }}>{preliminary.avgPlayers.toLocaleString()}</span> (hittills)
        </Typography>
        <Typography sx={{ color: "#FFCA28", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Omsättning: <span style={{ color: "#FFCA28" }}>{preliminary.estimatedRevenue.toLocaleString()} €M</span>
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Förändring från {previousPeriod.split(" ")[1]}: <span style={{ color: preliminary.changePercent >= 0 ? "#00e676" : "#FF6F61" }}>
            {preliminary.changePercent}% ({preliminary.changePercent >= 0 ? "+" : ""})
          </span>
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Intäkt Hittills: <span style={{ color: "#00e676" }}>{preliminary.revenueSoFar.toLocaleString()} €M</span>
        </Typography>
      </Box>

      {/* Progressindikator för aktuellt kvartal */}
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
          {currentQuarter} {currentYear} Progress
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

      {/* Graf för aktuellt kvartal */}
      {qData.length > 0 && (
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
            Spelaretrend ({currentQuarter} {currentYear})
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={qData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
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
          {tableData.map((row, index) => {
            const year = [twoBeforePeriod, previousPeriod, currentPeriod][index].split(" ")[0];
            const reportDate = getReportDate(row.period, year);
            const reportDateFormatted = reportDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

            return (
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
                  {row.upskattad?.toLocaleString() || "-"}
                </TableCell>
                <TableCell sx={{ color: "#00e676", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                  {row.faktisk?.toLocaleString() || `Kommer ${reportDateFormatted}!`}
                </TableCell>
                <TableCell sx={{ color: row.skillnad !== null ? (row.skillnad > 0 ? "#00e676" : "#FF6F61") : "#e0e0e0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontFamily: "'Roboto', sans-serif", padding: { xs: "6px 8px", sm: "16px" } }}>
                  {row.skillnad !== null ? `${row.skillnad}%` : "-"}
                </TableCell>
              </TableRow>
            );
          })}
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

      {/* Disclaimer */}
      <Typography
        sx={{
          color: "#b0b0b0",
          fontSize: { xs: "0.75rem", sm: "0.85rem" },
          marginTop: "20px",
          textAlign: "center",
          fontStyle: "italic",
          lineHeight: 1.5,
          fontFamily: "'Roboto', sans-serif",
          maxWidth: "90%",
        }}
      >
        Ansvarsfriskrivning: Denna rapport är baserad på uppskattningar där omsättningen för {currentQuarter} {currentYear} beräknas proportionellt mot {previousPeriod.split(" ")[1]} {previousPeriod.split(" ")[0]}s liveCasino-omsättning per genomsnittlig spelare. Siffrorna för genomsnittliga spelare och omsättning avser enbart gameshow-segmentet och reflekterar inte nödvändigtvis bolagets totala verksamhet eller exakta spelarantal. Rapporten är avsedd att ge en indikativ trend och bör inte betraktas som en officiell finansiell rapport.
      </Typography>
    </Box>
  );
};

export default IntelligenceIncomeReport;