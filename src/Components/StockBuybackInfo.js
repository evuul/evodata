'use client';
import React, { useState } from "react";
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
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { keyframes } from "@emotion/react";
import oldBuybackData from "../app/data/oldBuybackData.json";
import { useStockPriceContext } from '../context/StockPriceContext';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// Växelkurs (exempelvärde)
const exchangeRate = 10.83; // Exempel: 1 EUR = 10.83 SEK

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

  oldBuybackData.forEach((item) => {
    const year = item.Datum.split("-")[0];
    cumulativeShares += item.Antal_aktier;

    if (!ownershipByYear[year]) {
      ownershipByYear[year] = cumulativeShares;
    } else {
      ownershipByYear[year] = cumulativeShares;
    }
  });

  const evolutionOwnershipData = Object.keys(ownershipByYear)
    .map((year) => ({
      date: year,
      shares: ownershipByYear[year],
    }))
    .sort((a, b) => a.date - b.date);

  return evolutionOwnershipData;
};

// Beräkna totala makulerade aktier
const calculateCancelledShares = () => {
  return oldBuybackData
    .filter((item) => item.Antal_aktier < 0)
    .reduce((sum, item) => sum + Math.abs(item.Antal_aktier), 0);
};

// Beräkna utdelningar och aktieåterköp per år för "Återinvestering till investerare"
const calculateShareholderReturns = (dividendData) => {
  const dividendsByYear = {};
  dividendData.historicalDividends.forEach((dividend) => {
    const year = new Date(dividend.date).getFullYear();
    const totalSharesForYear = totalSharesData.find(
      (share) => share.date === year.toString()
    )?.totalShares || 0;

    const totalDividend = dividend.dividendPerShare * totalSharesForYear;

    if (!dividendsByYear[year]) {
      dividendsByYear[year] = 0;
    }
    dividendsByYear[year] += totalDividend;
  });

  if (dividendData.plannedDividends && dividendData.plannedDividends.length > 0) {
    dividendData.plannedDividends.forEach((planned) => {
      const year = new Date(planned.exDate).getFullYear();
      const totalSharesForYear = totalSharesData.find(
        (share) => share.date === year.toString()
      )?.totalShares || 0;

      const totalDividend = planned.dividendPerShare * totalSharesForYear;

      if (!dividendsByYear[year]) {
        dividendsByYear[year] = 0;
      }
      dividendsByYear[year] += totalDividend;
    });
  }

  const buybacksByYear = {};
  oldBuybackData.forEach((buyback) => {
    if (buyback.Antal_aktier > 0) {
      const year = new Date(buyback.Datum).getFullYear();
      if (!buybacksByYear[year]) {
        buybacksByYear[year] = 0;
      }
      buybacksByYear[year] += buyback.Transaktionsvärde;
    }
  });

  const years = new Set([
    ...Object.keys(dividendsByYear),
    ...Object.keys(buybacksByYear),
  ]);
  const combinedData = Array.from(years)
    .sort()
    .map((year) => ({
      year: parseInt(year),
      dividends: dividendsByYear[year] || 0,
      buybacks: buybacksByYear[year] || 0,
    }));

  const total = combinedData.reduce((sum, yearData) => {
    return sum + yearData.dividends + yearData.buybacks;
  }, 0);

  const totalDividends = combinedData.reduce((sum, yearData) => sum + yearData.dividends, 0);
  const totalBuybacks = combinedData.reduce((sum, yearData) => sum + yearData.buybacks, 0);

  const latestYear = Math.max(...combinedData.map(item => item.year));
  const latestYearData = combinedData.find(item => item.year === latestYear);
  const latestYearReturns = latestYearData ? (latestYearData.dividends + latestYearData.buybacks) : 0;

  return { combinedData, total, totalDividends, totalBuybacks, latestYearReturns, latestYear };
};

// Beräkna Evolutions ägande och makulerade aktier
const evolutionOwnershipData = calculateEvolutionOwnershipPerYear();
const cancelledShares = calculateCancelledShares();

const ownershipPercentageData = totalSharesData.map((item, index) => {
  const evolutionShares = evolutionOwnershipData.find((data) => data.date === item.date)?.shares || 0;
  return {
    date: item.date,
    percentage: evolutionShares > 0 && item.totalShares > 0 ? (evolutionShares / item.totalShares) * 100 : 0,
  };
});

const buybackDataForGraphDaily = oldBuybackData.filter((item) => item.Antal_aktier > 0);

const buybackDataForGraphYearly = () => {
  const yearlyData = {};
  oldBuybackData
    .filter((item) => item.Antal_aktier > 0)
    .forEach((item) => {
      const year = item.Datum.split("-")[0];
      if (!yearlyData[year]) {
        yearlyData[year] = { Datum: year, Antal_aktier: 0 };
      }
      yearlyData[year].Antal_aktier += item.Antal_aktier;
    });

  return Object.values(yearlyData).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

const calculateAverageDailyBuyback = () => {
  const positiveTransactions = oldBuybackData.filter((item) => item.Antal_aktier > 0);
  if (positiveTransactions.length === 0) return { averageDaily: 0, averagePrice: 0 };

  const firstDate = new Date(positiveTransactions[0].Datum);
  const today = new Date("2025-04-07");
  const timeDifference = today - firstDate;
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  const totalSharesBought = positiveTransactions.reduce((sum, item) => sum + item.Antal_aktier, 0);
  const totalTransactionValue = positiveTransactions.reduce((sum, item) => sum + item.Transaktionsvärde, 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;
  const averageDaily = daysDifference > 0 ? totalSharesBought / daysDifference : 0;

  return { averageDaily, averagePrice };
};

const StockBuybackInfo = ({
  isActive,
  buybackCash,
  sharesBought,
  averagePrice = 0,
  dividendData,
}) => {
  const [activeTab, setActiveTab] = useState("buyback");
  const [viewMode, setViewMode] = useState("daily");
  const [sortConfig, setSortConfig] = useState({ key: "Datum", direction: "desc" });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { stockPrice, marketCap, loading: loadingPrice, error: priceError } = useStockPriceContext();
  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 0) : stockPrice?.price?.regularMarketPrice?.raw || 0;

  const { combinedData: returnsData, total: totalReturns, totalDividends, totalBuybacks, latestYearReturns, latestYear } = calculateShareholderReturns(dividendData);

  const directYieldPercentage = marketCap > 0 ? (latestYearReturns / marketCap) * 100 : 0;

  const buybackCashInSEK = buybackCash * exchangeRate;
  const totalBuybackValue = sharesBought * averagePrice;
  const remainingCash = buybackCashInSEK - totalBuybackValue;
  const buybackProgress = (totalBuybackValue / buybackCashInSEK) * 100;
  const remainingSharesToBuy = remainingCash > 0 && currentSharePrice > 0 ? Math.floor(remainingCash / currentSharePrice) : 0;

  // Beräkna vinst/förlust för aktieåterköpen
  const profitPerShare = currentSharePrice - averagePrice;
  const totalProfitLoss = profitPerShare * sharesBought;

  const latestTotalShares = totalSharesData[totalSharesData.length - 1].totalShares;
  const latestEvolutionShares = evolutionOwnershipData[evolutionOwnershipData.length - 1]?.shares || 0;
  const latestOwnershipPercentage = (latestEvolutionShares / latestTotalShares) * 100;

  const { averageDaily: averageDailyBuyback, averagePrice: averageBuybackPrice } = calculateAverageDailyBuyback();

  const sortedData = [...oldBuybackData].sort((a, b) => {
    const key = sortConfig.key;
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    if (key === "Datum") {
      return direction * (new Date(a[key]) - new Date(b[key]));
    } else {
      return direction * (a[key] - b[key]);
    }
  });

  const tabsList = [
    "buyback",
    "ownership",
    "totalShares",
    "history",
    "returns",
  ];

  const handlePrevTab = () => {
    const currentIndex = tabsList.indexOf(activeTab);
    const prevIndex = (currentIndex - 1 + tabsList.length) % tabsList.length;
    setActiveTab(tabsList[prevIndex]);
  };

  const handleNextTab = () => {
    const currentIndex = tabsList.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabsList.length;
    setActiveTab(tabsList[nextIndex]);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
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
    const interval = Math.ceil((maxValue - minValue) / 5 / 1000) * 1000;
    const lowerBound = Math.floor(minValue / interval) * interval;
    const upperBound = Math.ceil(maxValue / interval) * interval;
    return [lowerBound, upperBound];
  };

  const chartData = returnsData.map((item) => ({
    year: item.year === 2025 ? `${item.year} (pågående)` : item.year,
    dividends: item.dividends / 1000000,
    buybacks: item.buybacks / 1000000,
  }));

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
        Aktieåterköpsinformation
      </Typography>

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
                maxHeight: "50vh",
                overflowY: "auto",
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
                WebkitOverflowScrolling: "touch",
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
          <MenuItem value="buyback">Återköpsstatus</MenuItem>
          <MenuItem value="ownership">Evolutions ägande</MenuItem>
          <MenuItem value="totalShares">Totala aktier</MenuItem>
          <MenuItem value="history">Återköpshistorik</MenuItem>
          <MenuItem value="returns">Återinvestering</MenuItem>
        </Select>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <IconButton
            onClick={handlePrevTab}
            sx={{
              color: "#00e676",
              "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
            }}
          >
            <ArrowBackIosIcon fontSize="small" />
          </IconButton>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
            sx={{
              color: "#ccc",
              "& .MuiTab-root": {
                fontSize: { xs: "0.8rem", sm: "1rem" },
                padding: { xs: "6px 8px", sm: "12px 16px" },
              },
            }}
            variant="scrollable"
            scrollButtons={false}
            allowScrollButtonsMobile={false}
          >
            <Tab label="Återköpsstatus" value="buyback" />
            <Tab label="Evolutions ägande" value="ownership" />
            <Tab label="Totala aktier" value="totalShares" />
            <Tab label="Återköpshistorik" value="history" />
            <Tab label="Återinvestering" value="returns" />
          </Tabs>
          <IconButton
            onClick={handleNextTab}
            sx={{
              color: "#00e676",
              "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
            }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {activeTab === "buyback" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: isActive ? "#00e676" : "#ff1744",
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Status på återköp: {isActive ? "Aktivt" : "Inaktivt"}
          </Typography>

          {loadingPrice ? (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Laddar vinst/förlust...
            </Typography>
          ) : (
            <Typography
              variant="body1"
              color={totalProfitLoss >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Vinst/Förlust på återköp: {totalProfitLoss.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
            </Typography>
          )}

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
            <Typography
              variant="body2"
              color="#ccc"
              align="center"
              sx={{
                marginTop: "5px",
                textAlign: "center",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              }}
            >
              {Math.floor(buybackProgress)}% av kassan har använts för återköp
            </Typography>
          </Box>

          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            {priceError && (
              <Typography
                variant="body2"
                color="#ff1744"
                sx={{
                  marginBottom: "10px",
                  textAlign: "center",
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                }}
              >
                {priceError}
              </Typography>
            )}
            <Typography
              variant="body1"
              color="#fff"
              sx={{
                marginBottom: "5px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Återköpta aktier: {sharesBought.toLocaleString()}
            </Typography>
            <Typography
              variant="body1"
              color="#fff"
              sx={{
                marginBottom: "5px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Snittkurs: {averagePrice ? averagePrice.toLocaleString() : "0"} SEK
            </Typography>
            <Typography
              variant="body1"
              color="#fff"
              sx={{
                marginBottom: "5px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Kassa för återköp (i SEK): {buybackCashInSEK.toLocaleString()} SEK
            </Typography>
            <Typography
              variant="body1"
              color="#fff"
              sx={{
                marginBottom: "5px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Kvar av kassan: {remainingCash.toLocaleString()} SEK
            </Typography>
            {loadingPrice ? (
              <Typography
                variant="body1"
                color="#ccc"
                sx={{
                  marginBottom: "5px",
                  textAlign: "center",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                Laddar aktiepris...
              </Typography>
            ) : (
              <Typography
                variant="body1"
                color="#00e676"
                sx={{
                  marginBottom: "5px",
                  textAlign: "center",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                Kvar att köpa för: {remainingSharesToBuy.toLocaleString()} aktier (baserat på {currentSharePrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK/aktie)
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {activeTab === "ownership" && (
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
            Evolutions ägande
          </Typography>

          <Typography
            variant="body1"
            color="#fff"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Evolution äger: {latestEvolutionShares.toLocaleString()} aktier
          </Typography>
          <Typography
            variant="body1"
            color="#FFCA28"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Ägarandel: {latestOwnershipPercentage.toFixed(2)}%
          </Typography>
          {cancelledShares > 0 && (
            <Typography
              variant="body1"
              color="#FF6F61"
              sx={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Makulerade aktier: {cancelledShares.toLocaleString()}
            </Typography>
          )}

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
            Antal aktier över tid
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={evolutionOwnershipData}
              margin={{
                top: 20,
                right: isMobile ? 20 : 20,
                bottom: isMobile ? 10 : 20,
                left: isMobile ? 20 : 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                stroke="#ccc"
                height={isMobile ? 30 : 40}
              >
                {!isMobile && (
                  <Label
                    value="År"
                    offset={-10}
                    position="insideBottom"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getYDomain(evolutionOwnershipData, "shares")}
                tickFormatter={formatYAxisTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Antal aktier"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
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
            Historisk data
          </Typography>
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "600px" : "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    År
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Evolutions aktier
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Ägarandel (%)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evolutionOwnershipData.map((item, index) => (
                  <TableRow key={item.date}>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.date}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.shares.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {ownershipPercentageData.find((data) => data.date === item.date)?.percentage.toFixed(2) || "0.00"}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {activeTab === "totalShares" && (
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
            Totala aktier
          </Typography>

          <Typography
            variant="body1"
            color="#fff"
            sx={{
              marginBottom: "20px",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Totalt antal aktier: {latestTotalShares.toLocaleString()}
          </Typography>

          <Typography
            variant="h6"
            color="#ccc"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Totala aktier över tid
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={totalSharesData}
              margin={{
                top: 20,
                right: isMobile ? 20 : 20,
                bottom: isMobile ? 10 : 20,
                left: isMobile ? 20 : 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                stroke="#ccc"
                height={isMobile ? 30 : 40}
              >
                {!isMobile && (
                  <Label
                    value="År"
                    offset={-10}
                    position="insideBottom"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getYDomain(totalSharesData, "totalShares")}
                tickFormatter={formatYAxisTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Antal aktier"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
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
            Historisk data
          </Typography>
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "600px" : "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    År
                  </TableCell>
                  <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                    Totala aktier
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {totalSharesData.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.date}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                      {item.totalShares.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {activeTab === "history" && (
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ overflowX: "hidden" }}>
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
            Återköpshistorik
          </Typography>

          <Typography
            variant="body1"
            color="#fff"
            sx={{
              marginBottom: "10px",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Genomsnittlig handel per dag: {Math.round(averageDailyBuyback).toLocaleString()} aktier
          </Typography>
          <Typography
            variant="body1"
            color="#fff"
            sx={{
              marginBottom: "20px",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Genomsnittspris: {averageBuybackPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
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
            <Tab label="Daglig" value="daily" />
            <Tab label="Årlig" value="yearly" />
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
            {viewMode === "daily" ? "Dagliga återköp" : "Årliga återköp"}
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={viewMode === "daily" ? buybackDataForGraphDaily : buybackDataForGraphYearly()}
              margin={{
                top: 20,
                right: isMobile ? 20 : 20,
                bottom: isMobile ? 10 : 20,
                left: isMobile ? 20 : 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="Datum"
                stroke="#ccc"
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value={viewMode === "daily" ? "Datum" : "År"}
                    offset={-10}
                    position="insideBottom"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getYDomain(viewMode === "daily" ? buybackDataForGraphDaily : buybackDataForGraphYearly(), "Antal_aktier")}
                tickFormatter={formatYAxisTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Antal aktier"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <Tooltip
                formatter={(value) => value.toLocaleString("sv-SE")}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Line
                type="monotone"
                dataKey="Antal_aktier"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
              />
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
            Transaktioner
          </Typography>
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
              <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "450px" : "auto" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" }, cursor: "pointer" }} onClick={() => handleSort("Datum")}>
                      Datum {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" }, cursor: "pointer" }} onClick={() => handleSort("Antal_aktier")}>
                      Antal aktier {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: "#ccc", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" }, cursor: "pointer" }} onClick={() => handleSort("Transaktionsvärde")}>
                      Transaktionsvärde (SEK) {sortConfig.key === "Transaktionsvärde" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                        {item.Datum}
                      </TableCell>
                      <TableCell sx={{ color: item.Antal_aktier < 0 ? "#FF6F61" : "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                        {item.Antal_aktier.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.8rem", sm: "1rem" } }}>
                        {item.Transaktionsvärde ? item.Transaktionsvärde.toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      {activeTab === "returns" && (
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
            Återinvestering till investerare
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Typography
              variant="h5"
              sx={{
                color: "#FFCA28",
                fontWeight: "bold",
                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" },
                textAlign: "center",
              }}
            >
              Total återinvestering: {(totalReturns / 1000000).toLocaleString("sv-SE")} Mkr
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#ccc",
                marginTop: "5px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              (Utdelningar: {(totalDividends / 1000000).toLocaleString("sv-SE")} Mkr, Aktieåterköp: {(totalBuybacks / 1000000).toLocaleString("sv-SE")} Mkr)
            </Typography>
            {loadingPrice ? (
              <Typography
                variant="body1"
                sx={{
                  color: "#ccc",
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                Laddar direktavkastning...
              </Typography>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  color: "#00e676",
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                Direktavkastning ({latestYear}): {directYieldPercentage.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% av marknadsvärdet ({(marketCap / 1000000000).toLocaleString("sv-SE")} Mdkr)
              </Typography>
            )}
          </Box>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
              <BarChart
                data={chartData}
                margin={{
                  top: 50,
                  right: isMobile ? 20 : 20,
                  left: isMobile ? 20 : 40,
                  bottom: isMobile ? 10 : 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="year"
                  stroke="#ccc"
                  tick={{ fill: "#ccc" }}
                  height={isMobile ? 30 : 40}
                >
                  {!isMobile && (
                    <Label
                      value="År"
                      offset={-10}
                      position="insideBottom"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tick={{ fill: "#ccc" }}
                  tickFormatter={(value) => `${value.toLocaleString("sv-SE")} Mkr`}
                  width={isMobile ? 40 : 60}
                >
                  {!isMobile && (
                    <Label
                      value="Belopp (Mkr)"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  contentStyle={{ backgroundColor: "#333", border: "none" }}
                  labelStyle={{ color: "#ccc" }}
                  itemStyle={{ color: "#ccc" }}
                  formatter={(value) => `${value.toLocaleString("sv-SE")} Mkr`}
                />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ color: "#ccc", marginBottom: 20 }}
                />
                <Bar dataKey="dividends" fill="#00e676" name="UTD" />
                <Bar dataKey="buybacks" fill="#FFCA28" name="Aktieåterköp" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              variant="body1"
              sx={{
                color: "#ccc",
                textAlign: "center",
                marginBottom: "20px",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Laddar data...
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
};

export default StockBuybackInfo;