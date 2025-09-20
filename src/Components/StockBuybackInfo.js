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
import buybackData from "../app/data/buybackData.json"; // Nuvarande återköp för "Återköpsstatus"-fliken
import oldBuybackData from "../app/data/oldBuybackData.json"; // Historiska och nuvarande återköp för övriga flikar
import { useStockPriceContext } from '../context/StockPriceContext';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// Växelkurs (exempelvärde)
const exchangeRate = 11.02; // Exempel: 1 EUR = 10.83 SEK

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
  { date: "2025", totalShares: 204462162 },
];

// Beräkna Evolutions ägande per år baserat på återköp och indragningar
const calculateEvolutionOwnershipPerYear = (data) => {
  const ownershipByYear = {};
  let cumulativeShares = 0;

  data.forEach((item) => {
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
const calculateCancelledShares = (data) => {
  return data
    .filter((item) => item.Antal_aktier < 0)
    .reduce((sum, item) => sum + Math.abs(item.Antal_aktier), 0);
};

// Beräkna utdelningar och aktieåterköp per år för "Återinvestering till investerare"
const calculateShareholderReturns = (dividendData, buybackData) => {
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
  buybackData.forEach((buyback) => {
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

// Beräkna Evolutions ägande och makulerade aktier med oldBuybackData
const evolutionOwnershipData = calculateEvolutionOwnershipPerYear(oldBuybackData);
const cancelledShares = calculateCancelledShares(oldBuybackData);

const ownershipPercentageData = totalSharesData.map((item, index) => {
  const evolutionShares = evolutionOwnershipData.find((data) => data.date === item.date)?.shares || 0;
  return {
    date: item.date,
    percentage: evolutionShares > 0 && item.totalShares > 0 ? (evolutionShares / item.totalShares) * 100 : 0,
  };
});

const buybackDataForGraphDaily = oldBuybackData.filter((item) => item.Antal_aktier > 0);

// ISO-vecka: få måndag (start) och söndag (slut) för en given dag
const getIsoWeekBounds = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=sön, 1=mån, ...
  const monday = new Date(d);
  const diffToMonday = (day + 6) % 7; // sön(0)->6, mån(1)->0, ...
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
};

// Arbetsvecka: måndag (start) till fredag (slut) för given dag
const getBusinessWeekBounds = (dateLike) => {
  const { monday } = getIsoWeekBounds(dateLike);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
};

// Hämta senaste arbetsveckans återköp (mån–fre) baserat på senaste datum i buybackData
const getLastWeekBuybacks = (data) => {
  if (!data || data.length === 0) {
    return { periodStart: null, periodEnd: null, entries: [], totalShares: 0, totalValue: 0 };
  }

  const positive = data.filter((d) => d.Antal_aktier > 0);
  if (positive.length === 0) {
    return { periodStart: null, periodEnd: null, entries: [], totalShares: 0, totalValue: 0 };
  }

  const maxTime = Math.max(...positive.map((d) => new Date(d.Datum).getTime()));
  const { monday, friday } = getBusinessWeekBounds(maxTime);

  const entries = positive
    .filter((d) => {
      const t = new Date(d.Datum).getTime();
      return t >= monday.getTime() && t <= friday.getTime();
    })
    .sort((a, b) => new Date(a.Datum) - new Date(b.Datum));

  const totalShares = entries.reduce((sum, d) => sum + (d.Antal_aktier || 0), 0);
  const totalValue = entries.reduce((sum, d) => sum + (d.Transaktionsvärde || 0), 0);

  return { periodStart: monday, periodEnd: friday, entries, totalShares, totalValue };
};

// Hämta föregående arbetsvecka (mån–fre) givet nuvarande veckans måndag
const getPreviousWeekBuybacks = (data, currentWeekStart) => {
  if (!data || !currentWeekStart) {
    return {
      periodStart: null,
      periodEnd: null,
      entries: [],
      totalShares: 0,
      totalValue: 0,
    };
  }

  const prevStart = new Date(currentWeekStart);
  prevStart.setHours(0, 0, 0, 0);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevStart.getDate() + 4);
  prevEnd.setHours(23, 59, 59, 999);

  const positive = data.filter((d) => d.Antal_aktier > 0);
  const entries = positive
    .filter((d) => {
      const t = new Date(d.Datum).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    })
    .sort((a, b) => new Date(a.Datum) - new Date(b.Datum));

  const totalShares = entries.reduce((sum, d) => sum + (d.Antal_aktier || 0), 0);
  const totalValue = entries.reduce((sum, d) => sum + (d.Transaktionsvärde || 0), 0);

  return {
    periodStart: prevStart,
    periodEnd: prevEnd,
    entries,
    totalShares,
    totalValue,
  };
};

// Funktion för att gruppera data årligen
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

// Funktion för att gruppera data månadsvis (ÅÅÅÅ-MM)
const buybackDataForGraphMonthly = () => {
  const monthlyData = {};
  oldBuybackData
    .filter((item) => item.Antal_aktier > 0)
    .forEach((item) => {
      const [year, month] = item.Datum.split("-").slice(0, 2);
      const monthKey = `${year}-${month}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { Datum: monthKey, Antal_aktier: 0 };
      }
      monthlyData[monthKey].Antal_aktier += item.Antal_aktier;
    });

  return Object.values(monthlyData).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

// Funktion för att gruppera data veckovis (baserat på ISO-veckor, ÅÅÅÅ-VW)
const buybackDataForGraphWeekly = () => {
  const weeklyData = {};
  oldBuybackData
    .filter((item) => item.Antal_aktier > 0)
    .forEach((item) => {
      const date = new Date(item.Datum);
      const year = date.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (firstDayOfYear.getDay() + 6) % 7; // Justera så att måndag är veckans första dag
      const daysSinceYearStart = Math.floor((date - firstDayOfYear) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.ceil((daysSinceYearStart + daysOffset + 1) / 7);
      const weekKey = `${year}-V${weekNumber.toString().padStart(2, '0')}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { Datum: weekKey, Antal_aktier: 0 };
      }
      weeklyData[weekKey].Antal_aktier += item.Antal_aktier;
    });

  return Object.values(weeklyData).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

// Funktion för att beräkna dynamiska värden från buybackData (för Återköpsstatus)
const calculateBuybackStats = (transactions) => {
  const positiveTransactions = transactions.filter(item => item.Antal_aktier > 0);
  if (positiveTransactions.length === 0) return { sharesBought: 0, averagePrice: 0 };

  const totalSharesBought = positiveTransactions.reduce((sum, item) => sum + item.Antal_aktier, 0);
  const totalTransactionValue = positiveTransactions.reduce((sum, item) => sum + item.Transaktionsvärde, 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;

  return { sharesBought: totalSharesBought, averagePrice };
};

// Beräkna historisk genomsnittlig köptakt (med oldBuybackData för Återköpshistorik)
const calculateAverageDailyBuyback = (data) => {
  const positiveTransactions = data.filter((item) => item.Antal_aktier > 0);
  if (positiveTransactions.length === 0) return { averageDaily: 0, averagePrice: 0 };

  const firstDate = new Date(positiveTransactions[0].Datum);
  const today = new Date("2025-08-14"); // Anpassad till dagens datum
  const timeDifference = today - firstDate;
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  const totalSharesBought = positiveTransactions.reduce((sum, item) => sum + item.Antal_aktier, 0);
  const totalTransactionValue = positiveTransactions.reduce((sum, item) => sum + item.Transaktionsvärde, 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;
  const averageDaily = daysDifference > 0 ? totalSharesBought / daysDifference : 0;

  return { averageDaily, averagePrice };
};

// Funktion för att beräkna uppskattat slutförandedatum baserat på buybackData (för Återköpsstatus)
const calculateEstimatedCompletion = (remainingCash, transactions) => {
  const totalShares = transactions.reduce((sum, item) => sum + item.Antal_aktier, 0);
  const totalValue = transactions.reduce((sum, item) => sum + item.Transaktionsvärde, 0);
  const averagePrice = totalShares > 0 ? totalValue / totalShares : 0;

  // Beräkna handelsdagar från historiska transaktioner
  const firstDate = new Date(Math.min(...transactions.map(item => new Date(item.Datum))));
  const lastDate = new Date(Math.max(...transactions.map(item => new Date(item.Datum))));
  let tradingDays = 0;
  let currentDate = new Date(firstDate);
  while (currentDate <= lastDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exkludera lördagar (6) och söndagar (0)
      tradingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const averageDailyShares = tradingDays > 0 ? totalShares / tradingDays : 0;

  const remainingSharesToBuy = averagePrice > 0 ? remainingCash / averagePrice : 0;
  const daysToCompletion = averageDailyShares > 0 ? remainingSharesToBuy / averageDailyShares : 0;

  // Använd dagens datum som startpunkt
  const today = new Date("2025-08-14"); // Anpassad till dagens datum
  let estimatedCompletionDate = new Date(today);

  // Lägg till handelsdagar och hoppa över helger
  let remainingTradingDays = Math.ceil(daysToCompletion);
  while (remainingTradingDays > 0) {
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 1);
    const dayOfWeek = estimatedCompletionDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Bara räkna arbetsdagar
      remainingTradingDays--;
    }
  }

  return {
    currentProgramAverageDailyShares: averageDailyShares,
    daysToCompletion: Math.ceil(daysToCompletion),
    estimatedCompletionDate: estimatedCompletionDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }),
  };
};

const StockBuybackInfo = ({
  isActive,
  buybackCash,
  dividendData,
}) => {
  const [activeTab, setActiveTab] = useState("buyback");
  const [viewMode, setViewMode] = useState("daily");
  const [chartTypeHistory, setChartTypeHistory] = useState("line"); // För Återköpshistorik
  const [chartTypeOwnership, setChartTypeOwnership] = useState("line"); // För Evolutions ägande
  const [chartTypeTotalShares, setChartTypeTotalShares] = useState("line"); // För Totala aktier
  const [sortConfig, setSortConfig] = useState({ key: "Datum", direction: "desc" });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { stockPrice, marketCap, loading: loadingPrice, error: priceError } = useStockPriceContext();
  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 0) : stockPrice?.price?.regularMarketPrice?.raw || 0;

  const { combinedData: returnsData, total: totalReturns, totalDividends, totalBuybacks, latestYearReturns, latestYear } = calculateShareholderReturns(dividendData, oldBuybackData);

  const directYieldPercentage = marketCap > 0 ? (latestYearReturns / marketCap) * 100 : 0;

  const buybackCashInSEK = buybackCash * exchangeRate;
  const { sharesBought, averagePrice } = calculateBuybackStats(buybackData); // Använd buybackData för Återköpsstatus
  const totalBuybackValue = sharesBought * averagePrice;
  const remainingCash = buybackCashInSEK - totalBuybackValue;
  const buybackProgress = buybackCashInSEK > 0 ? (totalBuybackValue / buybackCashInSEK) * 100 : 0;
  const remainingSharesToBuy = remainingCash > 0 && currentSharePrice > 0 ? Math.floor(remainingCash / currentSharePrice) : 0;
  const latestTotalShares = totalSharesData[totalSharesData.length - 1].totalShares;
  const remainingPercentage = latestTotalShares > 0 ? (remainingSharesToBuy / latestTotalShares) * 100 : 0;

  const profitPerShare = currentSharePrice - averagePrice;
  const totalProfitLoss = profitPerShare * sharesBought;

  const latestEvolutionShares = evolutionOwnershipData[evolutionOwnershipData.length - 1]?.shares || 0;
  const latestOwnershipPercentage = (latestEvolutionShares / latestTotalShares) * 100;

  const { averageDaily: historicalAverageDailyBuyback, averagePrice: averageBuybackPrice } = calculateAverageDailyBuyback(oldBuybackData); // Använd oldBuybackData för historik

  const { currentProgramAverageDailyShares, daysToCompletion, estimatedCompletionDate } = calculateEstimatedCompletion(remainingCash, buybackData); // Använd buybackData för Återköpsstatus

  // Senaste veckans återköp baserat på buybackData
  const lastWeek = getLastWeekBuybacks(buybackData);
  const prevWeek = getPreviousWeekBuybacks(buybackData, lastWeek.periodStart);
  const deltaShares = (lastWeek.totalShares || 0) - (prevWeek.totalShares || 0);

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

  const handleChartTypeChange = (tab) => (event, newValue) => {
    if (tab === "history") setChartTypeHistory(newValue);
    if (tab === "ownership") setChartTypeOwnership(newValue);
    if (tab === "totalShares") setChartTypeTotalShares(newValue);
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  const formatYAxisTick = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString("sv-SE");
  };

  const getYDomain = (data, key) => {
    if (!data || data.length === 0) return [0, 1000];
    const values = data.map(item => item[key]);
    const minValue = Math.min(...values, 0); // Inkludera 0 som lägsta värde
    const maxValue = Math.max(...values);
    const padding = maxValue * 0.1; // Lägg till 10% padding över maxvärdet
    const upperBound = Math.ceil((maxValue + padding) / stepSize) * stepSize; // Anpassa till stegstorlek
    const lowerBound = Math.floor(minValue / stepSize) * stepSize;
    return [lowerBound, upperBound];
  };

  const getDynamicStep = (data, key, viewMode) => {
    const values = data.map(item => item[key]);
    const maxValue = Math.max(...values);
    if (viewMode === "daily") {
      return maxValue < 10000 ? 1000 : maxValue < 50000 ? 5000 : 10000;
    } else if (viewMode === "weekly") {
      return maxValue < 50000 ? 5000 : maxValue < 200000 ? 20000 : 50000;
    } else if (viewMode === "monthly") {
      return maxValue < 200000 ? 20000 : maxValue < 1000000 ? 100000 : 500000;
    } else if (viewMode === "yearly") {
      return maxValue < 1000000 ? 100000 : 500000;
    }
    return 500000; // Standardsteg om inget matchar
  };

  const getYTickValues = (data, key, viewMode) => {
    const [min, max] = getYDomain(data, key);
    const step = getDynamicStep(data, key, viewMode);
    const ticks = [];
    for (let i = min; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  };

  let stepSize = getDynamicStep(buybackDataForGraphDaily, "Antal_aktier", viewMode);

  const chartData = returnsData.map((item) => ({
    year: item.year === 2025 ? `${item.year} (pågående)` : item.year,
    dividends: item.dividends / 1000000,
    buybacks: item.buybacks / 1000000,
  }));

  const historyChartData = viewMode === "daily"
    ? buybackDataForGraphDaily
    : viewMode === "weekly"
    ? buybackDataForGraphWeekly()
    : viewMode === "monthly"
    ? buybackDataForGraphMonthly()
    : buybackDataForGraphYearly();

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        margin: "16px auto",
        width: { xs: "92%", sm: "85%", md: "75%" },
        textAlign: "center",
        boxSizing: "border-box",
        minHeight: "200px",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#fff",
          marginBottom: "12px",
          fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
          letterSpacing: "0.5px",
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
              fontSize: { xs: "0.9rem", sm: "1rem" },
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
                  fontSize: { xs: "0.9rem", sm: "1rem" },
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
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
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
            variant="h6"
            sx={{
              fontWeight: 700,
              color: isActive ? "#00e676" : "#ff1744",
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Status på återköp: {isActive ? "Aktivt" : "Inaktivt"}
          </Typography>

          {loadingPrice ? (
            <Typography
              variant="body2"
              color="#ccc"
              sx={{
                marginBottom: "20px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Laddar vinst/förlust...
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color={totalProfitLoss >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "20px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
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
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
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
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                }}
              >
                {priceError}
              </Typography>
            )}
            <Typography
              variant="body2"
              color="#fff"
              sx={{
                marginBottom: "5px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Återköpta aktier: {sharesBought.toLocaleString()}
            </Typography>
            <Typography
              variant="body2"
              color="#fff"
              sx={{
                marginBottom: "5px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Snittkurs: {averagePrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
            </Typography>
            <Typography
              variant="body2"
              color="#fff"
              sx={{
                marginBottom: "5px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Kassa för återköp (i SEK): {buybackCashInSEK.toLocaleString()} SEK
            </Typography>
            <Typography
              variant="body2"
              color="#fff"
              sx={{
                marginBottom: "5px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Kvar av kassan: {remainingCash.toLocaleString()} SEK
            </Typography>
            {loadingPrice ? (
              <Typography
                variant="body2"
                color="#ccc"
                sx={{
                  marginBottom: "5px",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                }}
              >
                Laddar aktiepris...
              </Typography>
            ) : (
              <Box>
                <Typography
                  variant="body2"
                  color="#00e676"
                  sx={{
                    marginBottom: "5px",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  }}
                >
                  Kvar att köpa för: {remainingSharesToBuy.toLocaleString()} aktier (baserat på {currentSharePrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK/aktie)
                </Typography>
                <Typography
                  variant="body2"
                  color="#00e676"
                  sx={{
                    marginBottom: "5px",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  }}
                >
                  Motsvarar {remainingPercentage.toFixed(2)}% av bolagets aktier
                </Typography>
              </Box>
            )}
            {isActive && remainingCash > 0 && (
              <>
                <Typography
                  variant="body2"
                  color="#FFCA28"
                  sx={{
                    marginTop: "10px",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  }}
                >
                  Genomsnittlig köptakt (nuvarande program): {Math.round(currentProgramAverageDailyShares).toLocaleString()} aktier/dag
                </Typography>
                <Typography
                  variant="body2"
                  color="#FFCA28"
                  sx={{
                    marginTop: "5px",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  }}
                >
                  Uppskattat slutförandedatum (baserat på nuvarande program): {estimatedCompletionDate} (om {daysToCompletion} dagar)
                </Typography>
              </>
            )}
            {/* Senaste veckans återköp */}
            <Box mt={3} sx={{ width: "100%" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "8px",
                  fontSize: { xs: "1.0rem", sm: "1.2rem" },
                }}
              >
                Senaste veckan
              </Typography>
              {lastWeek.entries.length > 0 ? (
                <>
                  <Typography
                    variant="body2"
                    color="#ccc"
                    sx={{ marginBottom: "8px" }}
                  >
                    Period: {lastWeek.periodStart.toLocaleDateString("sv-SE")} – {lastWeek.periodEnd.toLocaleDateString("sv-SE")}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 1 }} color="#fff">
                    Förändring mot föregående vecka:{" "}
                    <Box component="span" sx={{ fontWeight: 700, color: deltaShares > 0 ? '#00e676' : deltaShares < 0 ? '#ff1744' : '#ccc' }}>
                      {(deltaShares > 0 ? '+' : '') + deltaShares.toLocaleString('sv-SE')} aktier
                    </Box>
                  </Typography>

                  <TableContainer
                    sx={{
                      maxHeight: { xs: "none", sm: "none" },
                      backgroundColor: "#1f1f1f",
                      borderRadius: "12px",
                      border: "1px solid #2b2b2b",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                      overflowX: { xs: "auto", sm: "visible" },
                      overflowY: "visible",
                    }}
                  >
                    <Table
                      size="small"
                      stickyHeader
                      aria-label="Senaste veckans återköp"
                      sx={{
                        minWidth: 520,
                        "& .MuiTableCell-root": {
                          borderBottom: "1px solid #2b2b2b",
                          padding: "10px 14px",
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              color: "#fff",
                              backgroundColor: "#242424",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              letterSpacing: ".4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Datum
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: "#fff",
                              backgroundColor: "#242424",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              letterSpacing: ".4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Antal aktier
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: "#fff",
                              backgroundColor: "#242424",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              letterSpacing: ".4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Transaktionsvärde (SEK)
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lastWeek.entries.map((row, idx) => (
                          <TableRow
                            key={`${row.Datum}-${idx}`}
                            hover
                            sx={{
                              backgroundColor: idx % 2 === 0 ? "#202020" : "#1b1b1b",
                              transition: "background-color 0.2s ease",
                              "&:hover": { backgroundColor: "#2a2a2a" },
                            }}
                          >
                            <TableCell sx={{ color: "#ddd" }}>
                              {new Date(row.Datum).toLocaleDateString("sv-SE")}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#ddd", fontFeatureSettings: '"tnum"' }}>
                              {(row.Antal_aktier || 0).toLocaleString("sv-SE")}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#ddd", fontFeatureSettings: '"tnum"' }}>
                              {(row.Transaktionsvärde || 0).toLocaleString("sv-SE")}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          sx={{
                            background: "linear-gradient(180deg, #1f1f1f, #1b1b1b)",
                          }}
                        >
                          <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Totalt</TableCell>
                          <TableCell align="right" sx={{ color: "#00e676", fontWeight: 700 }}>
                            {lastWeek.totalShares.toLocaleString("sv-SE")}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "#00e676", fontWeight: 700 }}>
                            {lastWeek.totalValue.toLocaleString("sv-SE")}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" color="#ccc">
                  Inga återköp under den senaste veckan i datat.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === "ownership" && (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#fff",
              marginBottom: "20px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Evolutions ägande
          </Typography>

          <Typography
            variant="body2"
            color="#fff"
            sx={{
              marginBottom: "10px",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            Evolution äger: {latestEvolutionShares.toLocaleString()} aktier
          </Typography>
          <Typography
            variant="body2"
            color="#FFCA28"
            sx={{
              marginBottom: "10px",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            Ägarandel: {latestOwnershipPercentage.toFixed(2)}%
          </Typography>
          {cancelledShares > 0 && (
            <Typography
              variant="body2"
              color="#FF6F61"
              sx={{
                marginBottom: "20px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              Makulerade aktier: {cancelledShares.toLocaleString()}
            </Typography>
          )}

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginTop: "20px",
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Antal aktier över tid
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "20px" }}>
            <Tabs
              value={chartTypeOwnership}
              onChange={handleChartTypeChange("ownership")}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
              sx={{
                color: "#ccc",
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
          </Box>

          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            {chartTypeOwnership === "line" ? (
              <LineChart
                data={evolutionOwnershipData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 10 : 20,
                  left: isMobile ? -10 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(evolutionOwnershipData, "shares")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(evolutionOwnershipData, "shares", "yearly")}
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
            ) : (
              <BarChart
                data={evolutionOwnershipData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 10 : 20,
                  left: isMobile ? -10 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(evolutionOwnershipData, "shares")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(evolutionOwnershipData, "shares", "yearly")}
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
                <Bar dataKey="shares" fill="#00e676" name="Antal aktier" />
              </BarChart>
            )}
          </ResponsiveContainer>

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginTop: "20px",
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Historisk data
          </Typography>
          <Box
            sx={{
              overflowX: "auto",
              width: "100%",
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#00e676",
                borderRadius: "10px",
              },
            }}
          >
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "10px", minWidth: isMobile ? "600px" : "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                    År
                  </TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                    Evolutions aktier
                  </TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                    Ägarandel (%)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evolutionOwnershipData.map((item, index) => (
                  <TableRow key={item.date}>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                      {item.date}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                      {item.shares.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
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
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#fff",
              marginBottom: "20px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Totala aktier
          </Typography>

          <Typography
            variant="body2"
            color="#fff"
            sx={{
              marginBottom: "20px",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            Totalt antal aktier: {latestTotalShares.toLocaleString()}
          </Typography>

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Totala aktier över tid
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "20px" }}>
            <Tabs
              value={chartTypeTotalShares}
              onChange={handleChartTypeChange("totalShares")}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
              sx={{
                color: "#ccc",
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
          </Box>

          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            {chartTypeTotalShares === "line" ? (
              <LineChart
                data={totalSharesData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 10 : 20,
                  left: isMobile ? -10 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(totalSharesData, "totalShares")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(totalSharesData, "totalShares", "yearly")}
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
            ) : (
              <BarChart
                data={totalSharesData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 10 : 20,
                  left: isMobile ? -10 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(totalSharesData, "totalShares")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(totalSharesData, "totalShares", "yearly")}
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
                <Bar dataKey="totalShares" fill="#00e676" name="Antal aktier" />
              </BarChart>
            )}
          </ResponsiveContainer>

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginTop: "20px",
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Historisk data
          </Typography>
          <Box
            sx={{
              overflowX: "auto",
              width: "100%",
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#00e676",
                borderRadius: "10px",
              },
            }}
          >
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "10px", minWidth: isMobile ? "600px" : "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                    År
                  </TableCell>
                  <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                    Totala aktier
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {totalSharesData.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                      {item.date}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
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
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#fff",
              marginBottom: "20px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Återköpshistorik
          </Typography>

          <Typography
            variant="body2"
            color="#fff"
            sx={{
              marginBottom: "10px",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            Genomsnittlig handel per dag: {Math.round(historicalAverageDailyBuyback).toLocaleString()} aktier
          </Typography>
          <Typography
            variant="body2"
            color="#fff"
            sx={{
              marginBottom: "20px",
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
            }}
          >
            Genomsnittspris: {averageBuybackPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "20px" }}>
            <Tabs
              value={viewMode}
              onChange={handleViewModeChange}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
              sx={{
                color: "#ccc",
                "& .MuiTab-root": {
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  padding: { xs: "6px 8px", sm: "12px 16px" },
                },
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab label="Daglig" value="daily" />
              <Tab label="Veckovis" value="weekly" />
              <Tab label="Månadsvis" value="monthly" />
              <Tab label="Årlig" value="yearly" />
            </Tabs>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "20px" }}>
            <Tabs
              value={chartTypeHistory}
              onChange={handleChartTypeChange("history")}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
              sx={{
                color: "#ccc",
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
          </Box>

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            {viewMode === "daily" ? "Dagliga återköp" : viewMode === "weekly" ? "Veckovisa återköp" : viewMode === "monthly" ? "Månadsvisa återköp" : "Årliga återköp"}
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            {chartTypeHistory === "line" ? (
              <LineChart
                data={historyChartData}
                margin={{
                  top: 10,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 0 : 20,
                  left: isMobile ? 0 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="Datum"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 40 : 60}
                >
                  {!isMobile && (
                    <Label
                      value={viewMode === "daily" ? "Datum" : viewMode === "weekly" ? "Vecka" : viewMode === "monthly" ? "Månad" : "År"}
                      offset={-10}
                      position="insideBottom"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(historyChartData, "Antal_aktier")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(historyChartData, "Antal_aktier", viewMode)}
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
            ) : (
              <BarChart
                data={historyChartData}
                margin={{
                  top: 10,
                  right: isMobile ? 10 : 20,
                  bottom: isMobile ? 0 : 20,
                  left: isMobile ? 0 : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="Datum"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 40 : 60}
                >
                  {!isMobile && (
                    <Label
                      value={viewMode === "daily" ? "Datum" : viewMode === "weekly" ? "Vecka" : viewMode === "monthly" ? "Månad" : "År"}
                      offset={-10}
                      position="insideBottom"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
                  domain={getYDomain(historyChartData, "Antal_aktier")}
                  tickFormatter={formatYAxisTick}
                  width={isMobile ? 40 : 60}
                  ticks={getYTickValues(historyChartData, "Antal_aktier", viewMode)}
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
                <Bar dataKey="Antal_aktier" fill="#00e676" name="Antal aktier" />
              </BarChart>
            )}
          </ResponsiveContainer>

          <Typography
            variant="h6"
            color="#00e676"
            sx={{
              marginTop: "20px",
              marginBottom: "10px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Transaktioner
          </Typography>
          <Box
            sx={{
              overflowX: "auto",
              width: "100%",
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#00e676",
                borderRadius: "10px",
              },
            }}
          >
            <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
              <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "10px", minWidth: isMobile ? "450px" : "auto" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" }, cursor: "pointer" }} onClick={() => handleSort("Datum")}>
                      Datum {sortConfig.key === "Datum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" }, cursor: "pointer" }} onClick={() => handleSort("Antal_aktier")}>
                      Antal aktier {sortConfig.key === "Antal_aktier" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" }, cursor: "pointer" }} onClick={() => handleSort("Transaktionsvärde")}>
                      Transaktionsvärde (SEK) {sortConfig.key === "Transaktionsvärde" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                        {item.Datum}
                      </TableCell>
                      <TableCell sx={{ color: item.Antal_aktier < 0 ? "#FF6F61" : "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
                        {item.Antal_aktier.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ color: "#fff", textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "4px", sm: "8px" } }}>
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
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#fff",
              marginBottom: "20px",
              fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
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
                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
              }}
            >
              Total återinvestering: {(totalReturns / 1000000).toLocaleString("sv-SE")} Mkr
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#ccc",
                marginTop: "5px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              }}
            >
              (Utdelningar: {(totalDividends / 1000000).toLocaleString("sv-SE")} Mkr, Aktieåterköp: {(totalBuybacks / 1000000).toLocaleString("sv-SE")} Mkr)
            </Typography>
            {loadingPrice ? (
              <Typography
                variant="body2"
                sx={{
                  color: "#ccc",
                  marginTop: "10px",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                }}
              >
                Laddar direktavkastning...
              </Typography>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "#00e676",
                  marginTop: "10px",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
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
                  left: isMobile ? -20 : 0,
                  bottom: isMobile ? 10 : 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="year"
                  stroke="#ccc"
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  tick={{ fontSize: { xs: 12, sm: 14 } }}
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
                  wrapperStyle={{ color: "#ccc", marginBottom: 20, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } }}
                />
                <Bar dataKey="dividends" fill="#00e676" name="UTD" />
                <Bar dataKey="buybacks" fill="#FFCA28" name="Aktieåterköp" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: "#ccc",
                marginBottom: "20px",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
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
