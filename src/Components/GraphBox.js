'use client';
import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const GraphBox = ({
  revenueData,
  marginData,
  annualRevenueData,
  annualMarginData,
  playersData,
  dividendData,
  financialReports,
}) => {
  const [activeTab, setActiveTab] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarterly");
  const [selectedGeoYear, setSelectedGeoYear] = useState(
    financialReports.financialReports[financialReports.financialReports.length - 1].year.toString()
  );
  const [selectedGeoPeriod, setSelectedGeoPeriod] = useState("Q4");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const today = new Date("2025-04-07");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  const handleGeoYearChange = (event, newValue) => {
    setSelectedGeoYear(newValue);
    setSelectedGeoPeriod("Helår");
  };

  const handleGeoPeriodChange = (event, newValue) => {
    setSelectedGeoPeriod(newValue);
  };

  // Formatera data för utdelningsgrafen
  const historical = (dividendData.historicalDividends || []).map(item => ({
    date: item.date,
    dividendPerShare: item.dividendPerShare,
    type: "historical",
    dividendYield: item.sharePriceAtDividend
      ? (item.dividendPerShare / item.sharePriceAtDividend) * 100
      : 0,
    isFuture: false,
  }));

  const planned = (dividendData.plannedDividends || []).map((item, index) => ({
    date: item.paymentDate,
    dividendPerShare: item.dividendPerShare,
    type: "planned",
    dividendYield: dividendData.currentSharePrice
      ? (item.dividendPerShare / dividendData.currentSharePrice) * 100
      : 0,
    isFuture: new Date(item.paymentDate) > today,
    exDate: item.exDate,
    isUpcoming: index === 0,
  }));

  const combinedDividendData = [...historical, ...planned].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const plannedYield = planned[0]?.dividendYield || 0;
  const latestHistorical = historical[historical.length - 1];

  // Hämta unika årtal från financialReports, bara från 2020 och framåt
  const uniqueYears = [...new Set(
    financialReports.financialReports
      .filter(report => report.year >= 2020)
      .map(report => report.year)
  )].sort();

  // Sätt default selectedGeoYear till det senaste årtalet från 2020 och framåt
  useEffect(() => {
    if (uniqueYears.length > 0 && !uniqueYears.includes(parseInt(selectedGeoYear))) {
      setSelectedGeoYear(uniqueYears[uniqueYears.length - 1].toString());
    }
  }, [uniqueYears, selectedGeoYear]);

  // Hämta tillgängliga kvartal för det valda årtalet
  const availableQuarters = useMemo(() => {
    const quarters = financialReports.financialReports
      .filter(report => report.year.toString() === selectedGeoYear)
      .map(report => report.quarter);
    return [...new Set(quarters)];
  }, [selectedGeoYear, financialReports]);

  // Filtrera data för geografisk fördelning baserat på valt årtal och period
  const geoDataOptions = financialReports.financialReports
    .filter(report => report.year >= 2020)
    .map(report => ({
      label: `${report.year} ${report.quarter}`,
      year: report.year,
      quarter: report.quarter,
      data: [
        { name: "Europa", value: report.europe || 0 },
        { name: "Asien", value: report.asia || 0 },
        { name: "Nordamerika", value: report.northAmerica || 0 },
        { name: "Latinamerika", value: report.latAm || 0 },
        { name: "Övrigt", value: report.other || 0 },
      ],
    }));

  // Beräkna data för valt årtal och period
  const selectedGeoData = useMemo(() => {
    if (selectedGeoPeriod === "Helår") {
      const yearlyReports = geoDataOptions.filter(option => option.year.toString() === selectedGeoYear);
      const summedData = [
        { name: "Europa", value: 0 },
        { name: "Asien", value: 0 },
        { name: "Nordamerika", value: 0 },
        { name: "Latinamerika", value: 0 },
        { name: "Övrigt", value: 0 },
      ];

      yearlyReports.forEach(report => {
        report.data.forEach((region, index) => {
          summedData[index].value += region.value;
        });
      });

      return summedData;
    } else {
      const selectedOption = geoDataOptions.find(
        option => option.year.toString() === selectedGeoYear && option.quarter === selectedGeoPeriod
      );
      return selectedOption ? selectedOption.data : [];
    }
  }, [selectedGeoYear, selectedGeoPeriod, geoDataOptions]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Förbered data för LiveCasino vs RNG (Stacked Bar Chart)
  const liveCasinoRngDataQuarterly = financialReports.financialReports
    .filter(report => report.year >= 2020)
    .map(report => ({
      date: `${report.year} ${report.quarter}`,
      liveCasino: report.liveCasino || 0,
      rng: report.rng || 0,
    }));

  const liveCasinoRngDataYearly = [];
  const years = [...new Set(financialReports.financialReports.map(report => report.year))].filter(year => year >= 2020);
  years.forEach(year => {
    const yearlyReports = financialReports.financialReports.filter(report => report.year === year);
    const totalLiveCasino = yearlyReports.reduce((sum, report) => sum + (report.liveCasino || 0), 0);
    const totalRng = yearlyReports.reduce((sum, report) => sum + (report.rng || 0), 0);
    liveCasinoRngDataYearly.push({
      date: `${year} Helår`,
      liveCasino: totalLiveCasino,
      rng: totalRng,
    });
  });

  // Logga datan för felsökning
  console.log("liveCasinoRngDataQuarterly:", liveCasinoRngDataQuarterly);
  console.log("liveCasinoRngDataYearly:", liveCasinoRngDataYearly);

  // Beräkna genomsnittligt antal spelare för de senaste 30 dagarna
  const calculateAveragePlayers = (data, days) => {
    if (!data || !Array.isArray(data) || data.length === 0) return { average: 0, daysCount: 0 };

    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - days);

    const recentData = data.filter(item => {
      const itemDate = new Date(item.Datum);
      return itemDate >= cutoffDate && itemDate <= today && !isNaN(itemDate);
    });

    const totalPlayers = recentData.reduce((sum, item) => sum + (Number(item.Players) || 0), 0);
    const average = recentData.length > 0 ? totalPlayers / recentData.length : 0;

    return {
      average: Math.round(average),
      daysCount: recentData.length,
    };
  };

  const { average: avgPlayers, daysCount } = useMemo(() => calculateAveragePlayers(playersData, 30), [playersData]);

  // Formatering för Y-axeln
  const formatPlayersTick = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString("sv-SE");
  };

  const getPlayersYDomain = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [0, 1];

    const values = data.map(item => {
      const val = item.Players;
      return isNaN(val) ? 0 : Number(val);
    }).filter(val => !isNaN(val));

    if (values.length === 0) return [0, 1];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const lowerBound = Math.floor(minValue / 2000) * 2000;
    const upperBound = Math.ceil(maxValue / 2000) * 2000;
    return [lowerBound, upperBound];
  };

  const formatRevenueTick = (value) => {
    return `${value} MEUR`;
  };

  const formatMarginTick = (value) => {
    return `${value}%`;
  };

  const formatDividendTick = (value) => {
    return `${value} SEK`;
  };

  const formatDividendYieldTick = (value) => {
    return `${value}%`;
  };

  const formatLiveCasinoRngTick = (value) => {
    return `${value} MEUR`;
  };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: { xs: "15px", sm: "25px" },
        margin: "20px auto",
        width: { xs: "95%", sm: "80%", md: "70%" },
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#00e676",
          marginBottom: "20px",
          textAlign: "center",
          fontSize: { xs: "1.5rem", sm: "2rem" },
        }}
      >
        Finansiell översikt
      </Typography>

      {/* Tabs för "Finansiell översikt" */}
      {isMobile ? (
        <Select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          fullWidth
          sx={{
            color: "#ccc",
            backgroundColor: "#2e2e2e",
            marginBottom: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            "& .MuiSelect-select": {
              padding: "12px 32px",
              textAlign: "center",
              fontSize: "1rem",
              fontWeight: "bold",
              transition: "background-color 0.3s ease",
            },
            "& .MuiSelect-icon": {
              color: "#00e676",
            },
            "&:hover": {
              backgroundColor: "#3e3e3e",
            },
            "&.Mui-focused": {
              backgroundColor: "#3e3e3e",
              boxShadow: "0 0 0 2px rgba(0, 230, 118, 0.3)",
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "#2e2e2e",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                maxHeight: "50vh", // Sätt en maxhöjd (50% av skärmhöjden)
                overflowY: "auto", // Aktivera vertikal scroll
                "& .MuiMenuItem-root": {
                  color: "#ccc",
                  textAlign: "center",
                  justifyContent: "center",
                  padding: "12px 16px",
                  fontSize: "1rem",
                  transition: "background-color 0.3s ease",
                  "&:hover": {
                    backgroundColor: "#00e676",
                    color: "#1e1e1e",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#00e676",
                    color: "#1e1e1e",
                    fontWeight: "bold",
                    "&:hover": {
                      backgroundColor: "#00c853",
                    },
                  },
                },
                // Förbättra scrollbeteende på mobila enheter
                WebkitOverflowScrolling: "touch", // Förbättrar scroll på iOS
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#2e2e2e",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#00e676",
                  borderRadius: "3px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "#00c853",
                },
              },
            },
          }}
        >
          <MenuItem value="revenue">Omsättning</MenuItem>
          <MenuItem value="margin">Marginal</MenuItem>
          <MenuItem value="dividend">Utdelning</MenuItem>
          <MenuItem value="players">AVG Spelare</MenuItem>
          <MenuItem value="geoDistribution">Geografisk fördelning</MenuItem>
          <MenuItem value="liveCasinoRng">LiveCasino vs RNG</MenuItem>
        </Select>
      ) : (
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          centered
          sx={{
            color: "#ccc",
            marginBottom: "20px",
            "& .MuiTab-root": {
              fontSize: { xs: "0.8rem", sm: "1rem" },
              padding: { xs: "6px 8px", sm: "12px 16px" },
            },
          }}
        >
          <Tab label="Omsättning" value="revenue" />
          <Tab label="Marginal" value="margin" />
          <Tab label="Utdelning" value="dividend" />
          <Tab label="AVG Spelare" value="players" />
          <Tab label="Geografisk fördelning" value="geoDistribution" />
          <Tab label="LiveCasino vs RNG" value="liveCasinoRng" />
        </Tabs>
      )}

      {/* Omsättning */}
      {activeTab === "revenue" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{
              color: "#ccc",
              marginBottom: "20px",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
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

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            {viewMode === "quarterly" ? "Omsättning per kvartal" : "Omsättning per helår"}
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={viewMode === "quarterly" ? revenueData : annualRevenueData}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis
                stroke="#ccc"
                tickFormatter={formatRevenueTick}
                width={isMobile ? 40 : 60}
              >
                <Label
                  value="Omsättning (MEUR)"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              </YAxis>
              <Tooltip
                formatter={(value) => `${value.toLocaleString("sv-SE")} MEUR`}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Marginal */}
      {activeTab === "margin" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{
              color: "#ccc",
              marginBottom: "20px",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
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

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            {viewMode === "quarterly" ? "Marginal per kvartal" : "Marginal per helår"}
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={viewMode === "quarterly" ? marginData : annualMarginData}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={[0, 100]}
                tickFormatter={formatMarginTick}
                width={isMobile ? 40 : 60}
              >
                <Label
                  value="Marginal (%)"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              </YAxis>
              <Tooltip
                formatter={(value) => `${value.toLocaleString("sv-SE")}%`}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Utdelning */}
      {activeTab === "dividend" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00e676",
              marginBottom: "20px",
              textAlign: "center",
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Utdelning
          </Typography>

          <Box sx={{ textAlign: "center", marginBottom: "20px" }}>
            {latestHistorical && (
              <>
                <Typography
                  variant="body1"
                  color="#fff"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                >
                  Senaste utdelning: {latestHistorical.dividendPerShare.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
                </Typography>
                <Typography
                  variant="body1"
                  color="#fff"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                >
                  Direktavkastning: {(latestHistorical.dividendYield || 0).toFixed(2)}% (baserat på aktiekurs {latestHistorical.sharePriceAtDividend} SEK)
                </Typography>
              </>
            )}
            {planned.length > 0 && (
              <>
                <Typography
                  variant="body1"
                  color="#FFD700"
                  sx={{ marginTop: "10px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
                >
                  Kommande utdelning:
                </Typography>
                <Typography
                  variant="body1"
                  color="#FFD700"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                >
                  X-dag: {planned[0].exDate} | Utdelningsdag: {planned[0].date} | Planerad utdelning: {planned[0].dividendPerShare.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK | Direktavkastning: {plannedYield.toFixed(2)}% (baserat på nuvarande kurs {dividendData.currentSharePrice} SEK)
                </Typography>
              </>
            )}
          </Box>

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Utdelning över tid
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={combinedDividendData}
              margin={{ top: 20, right: isMobile ? 20 : 40, bottom: 20, left: isMobile ? 20 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis
                yAxisId="left"
                stroke="#ccc"
                tickFormatter={formatDividendTick}
                width={isMobile ? 40 : 60}
              >
                <Label
                  value="Utdelning (SEK)"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              </YAxis>
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ccc"
                tickFormatter={formatDividendYieldTick}
                width={isMobile ? 40 : 60}
              >
                <Label
                  value="Direktavkastning (%)"
                  angle={90}
                  offset={-10}
                  position="insideRight"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              </YAxis>
              <Tooltip
                formatter={(value, name) => [
                  name === "Utdelning (SEK)" ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK` : `${value.toFixed(2)}%`,
                  name === "Utdelning (SEK)" ? "Utdelning per aktie" : "Direktavkastning",
                ]}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dividendPerShare"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
                name="Utdelning (SEK)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dividendYield"
                stroke="#FFCA28"
                strokeWidth={2}
                dot={{ r: 4, fill: "#FFCA28" }}
                activeDot={{ r: 6 }}
                name="Direktavkastning (%)"
              />
              <Legend verticalAlign="top" height={36} />
            </LineChart>
          </ResponsiveContainer>

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginTop: "20px",
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Historiska och planerade utdelningar
          </Typography>
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "600px" : "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Datum
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Utdelning per aktie (SEK)
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Direktavkastning (%)
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Typ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {combinedDividendData.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.date}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.dividendPerShare.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.dividendYield.toFixed(2)}%
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.type === "historical" ? "Historisk" : "Planerad"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {/* AVG Spelare */}
      {activeTab === "players" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="body1"
            sx={{
              color: "#ccc",
              textAlign: "center",
              marginBottom: "20px",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Genomsnitt antal: {avgPlayers.toLocaleString("sv-SE")} <br />
            Senaste {daysCount} dagar
          </Typography>

          <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <LineChart
              data={playersData}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="Datum" stroke="#ccc">
                <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getPlayersYDomain(playersData)}
                tickFormatter={formatPlayersTick}
                width={isMobile ? 40 : 60}
                tickCount={9}
                interval={0}
              >
                <Label
                  value="Antal spelare"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              </YAxis>
              <Tooltip
                formatter={(value) => `Spelare: ${value.toLocaleString("sv-SE")}`}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="Players"
                stroke="#9c27b0"
                strokeWidth={2}
                dot={{ r: 4, fill: "#9c27b0" }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Geografisk fördelning (Pie Chart) */}
      {activeTab === "geoDistribution" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00e676",
              marginBottom: "20px",
              textAlign: "center",
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Geografisk fördelning av intäkter
          </Typography>

          {/* Tabs för att välja årtal */}
          <Tabs
            value={selectedGeoYear}
            onChange={handleGeoYearChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{
              color: "#ccc",
              marginBottom: "10px",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
                padding: { xs: "6px 8px", sm: "12px 16px" },
              },
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {uniqueYears.map(year => (
              <Tab key={year} label={year} value={year.toString()} />
            ))}
          </Tabs>

          {/* Tabs för att välja kvartal eller helår */}
          <Tabs
            value={selectedGeoPeriod}
            onChange={handleGeoPeriodChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#00e676" } }}
            sx={{
              color: "#ccc",
              marginBottom: "20px",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
                padding: { xs: "6px 8px", sm: "12px 16px" },
              },
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {availableQuarters.includes("Q1") && <Tab label="Q1" value="Q1" />}
            {availableQuarters.includes("Q2") && <Tab label="Q2" value="Q2" />}
            {availableQuarters.includes("Q3") && <Tab label="Q3" value="Q3" />}
            {availableQuarters.includes("Q4") && <Tab label="Q4" value="Q4" />}
            <Tab label="Helår" value="Helår" />
          </Tabs>

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Intäkter per region ({selectedGeoYear} {selectedGeoPeriod})
          </Typography>

          {selectedGeoData.length > 0 && selectedGeoData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={selectedGeoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 80 : 100}
                  fill="#8884d8"
                  label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={isMobile ? false : true}
                >
                  {selectedGeoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value.toLocaleString("sv-SE")} MEUR`}
                  contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{ textAlign: "center", marginBottom: "20px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Ingen data tillgänglig för detta kvartal.
            </Typography>
          )}
        </Box>
      )}

      {/* LiveCasino vs RNG (Stacked Bar Chart) */}
      {activeTab === "liveCasinoRng" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center",
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            <span style={{ color: "#00e676" }}>LiveCasino</span>{" "}
            <span style={{ color: "#ccc" }}>vs</span>{" "}
            <span style={{ color: "#FFCA28" }}>RNG</span>
          </Typography>

          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{
              color: "#ccc",
              marginBottom: "20px",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
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

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            {viewMode === "quarterly" ? "Intäkter per kvartal" : "Intäkter per helår"}
          </Typography>
          {liveCasinoRngDataQuarterly.length > 0 || liveCasinoRngDataYearly.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart
                data={viewMode === "quarterly" ? liveCasinoRngDataQuarterly : liveCasinoRngDataYearly}
                margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#ccc">
                  <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tickFormatter={formatLiveCasinoRngTick}
                  width={isMobile ? 40 : 60}
                >
                  <Label
                    value="Intäkter (MEUR)"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                </YAxis>
                <Tooltip
                  formatter={(value) => `${value.toLocaleString("sv-SE")} MEUR`}
                  contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="liveCasino" stackId="a" fill="#00e676" name="LiveCasino" />
                <Bar dataKey="rng" stackId="a" fill="#FFCA28" name="RNG" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{ textAlign: "center", marginBottom: "20px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Ingen data tillgänglig för LiveCasino vs RNG.
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
};

export default GraphBox;