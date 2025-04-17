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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useStockPriceContext } from '../context/StockPriceContext';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const GraphBox = ({
  revenueData,
  marginData,
  annualRevenueData,
  annualMarginData,
  playersData,
  dividendData,
  financialReports,
  stockSymbol = 'EVO.ST',
}) => {
  const [activeTab, setActiveTab] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarterly");
  const [selectedGeoYear, setSelectedGeoYear] = useState(null); // Sätts dynamiskt
  const [selectedGeoPeriod, setSelectedGeoPeriod] = useState("Helår");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const today = new Date("2025-04-07");

  const { stockPrice, loading: loadingPrice, error: priceError } = useStockPriceContext();

  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 0) : stockPrice?.price?.regularMarketPrice?.raw || 0;

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangeratesapi.io/v1/latest?access_key=YOUR_API_KEY&symbols=SEK');
        const data = await response.json();
        const rate = data.rates.SEK;
        setExchangeRate(rate);
      } catch (error) {
        console.error("Kunde inte hämta växelkurs:", error);
        setExchangeRate(11.20); // Fallback till en standardväxelkurs
      }
    };

    fetchExchangeRate();
  }, []);

  React.useEffect(() => {
    if (stockPrice && !loadingPrice) {
      setLastUpdated(new Date());
    }
  }, [stockPrice, loadingPrice]);

  const tabsList = [
    "revenue",
    "margin",
    "eps",
    "dividend",
    "players",
    "geoDistribution",
    "liveCasinoRng",
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

  const handleGeoYearChange = (event, newValue) => {
    setSelectedGeoYear(newValue);
    setSelectedGeoPeriod("Helår");
  };

  const handleGeoPeriodChange = (event, newValue) => {
    setSelectedGeoPeriod(newValue);
  };

  const historical = (dividendData.historicalDividends || []).map(item => ({
    date: item.date,
    dividendPerShare: item.dividendPerShare,
    dividendYield: item.sharePriceAtDividend
      ? (item.dividendPerShare / item.sharePriceAtDividend) * 100
      : 0,
    isFuture: false,
  }));

  const planned = (dividendData.plannedDividends || []).map((item, index) => ({
    date: item.paymentDate,
    dividendPerShare: item.dividendPerShare,
    dividendYield: currentSharePrice
      ? (item.dividendPerShare / currentSharePrice) * 100
      : 0,
    isFuture: new Date(item.paymentDate) > today,
    exDate: item.exDate,
    isUpcoming: index === 0,
  }));

  const combinedDividendData = [...historical, ...planned].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const dividendGrowth = useMemo(() => {
    const historicalDividends = combinedDividendData.filter(item => !item.isFuture);
    if (historicalDividends.length < 2) return null;

    const latest = historicalDividends[historicalDividends.length - 1];
    const previous = historicalDividends[historicalDividends.length - 2];

    const dividendGrowth = ((latest.dividendPerShare - previous.dividendPerShare) / previous.dividendPerShare) * 100;
    const yieldGrowth = ((latest.dividendYield - previous.dividendYield) / previous.dividendYield) * 100;

    return {
      dividendGrowth: dividendGrowth.toFixed(2),
      yieldGrowth: yieldGrowth.toFixed(2),
      latestDate: latest.date,
      previousDate: previous.date,
    };
  }, [combinedDividendData]);

  const plannedYield = planned[0]?.dividendYield || 0;
  const latestHistorical = historical[historical.length - 1];

  // Filtrera finansiella rapporter för att bara inkludera år och kvartal med data
  const filteredFinancialReports = financialReports.financialReports.filter(report => {
    const hasGeoData = (report.europe || 0) + (report.asia || 0) + (report.northAmerica || 0) + (report.latAm || 0) + (report.other || 0) > 0;
    const hasLiveCasinoRngData = (report.liveCasino || 0) + (report.rng || 0) > 0;
    return hasGeoData || hasLiveCasinoRngData;
  });

  const uniqueYears = [...new Set(
    filteredFinancialReports
      .filter(report => report.year >= 2015)
      .map(report => report.year)
  )].sort();

  // Sätt default-värde för selectedGeoYear till det senaste året med data
  React.useEffect(() => {
    if (uniqueYears.length > 0 && !selectedGeoYear) {
      setSelectedGeoYear(uniqueYears[uniqueYears.length - 1].toString());
    }
  }, [uniqueYears, selectedGeoYear]);

  const availableQuarters = useMemo(() => {
    const quarters = filteredFinancialReports
      .filter(report => report.year.toString() === selectedGeoYear)
      .map(report => report.quarter);
    return [...new Set(quarters)].sort();
  }, [selectedGeoYear, filteredFinancialReports]);

  const geoDataOptions = filteredFinancialReports
    .filter(report => report.year >= 2015)
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

  // Skapa en lista över alla kvartal från 2015 Q1 till 2025 Q1
  const allQuarters = [];
  for (let year = 2015; year <= 2025; year++) {
    const quarters = year === 2015 ? ["Q1"] : year === 2025 ? ["Q1"] : ["Q1", "Q2", "Q3", "Q4"];
    quarters.forEach(quarter => {
      allQuarters.push({ year, quarter, date: `${year} ${quarter}` });
    });
  }

  // Omsättningsdata (revenue) med tillväxt
  const revenueDataQuarterlyRaw = revenueData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
    quarter: item.date.split(" ")[1],
  }));

  const revenueDataQuarterly = allQuarters.map(({ date, year, quarter }) => {
    const existing = revenueDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  });

  const revenueDataYearly = annualRevenueData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
  }));

  const revenueQuarterlyGrowth = revenueDataQuarterly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = revenueDataQuarterly.find(
      report => report.year === previousYear && report.quarter === current.quarter
    );
    if (previous && previous.value !== null && current.value !== null && previous.value !== 0) {
      const growth = ((current.value - previous.value) / previous.value) * 100;
      return { ...current, growth: growth.toFixed(2) };
    }
    return { ...current, growth: null };
  });

  const revenueYearlyGrowth = revenueDataYearly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = revenueDataYearly.find(report => report.year === previousYear);
    if (previous && previous.value !== 0) {
      const growth = ((current.value - previous.value) / previous.value) * 100;
      return { ...current, growth: growth.toFixed(2) };
    }
    return { ...current, growth: null };
  });

  // Marginaldata med förändring
  const marginDataQuarterlyRaw = marginData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
    quarter: item.date.split(" ")[1],
  }));

  const marginDataQuarterly = allQuarters.map(({ date, year, quarter }) => {
    const existing = marginDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  });

  const marginDataYearly = annualMarginData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
  }));

  const marginQuarterlyChange = marginDataQuarterly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = marginDataQuarterly.find(
      report => report.year === previousYear && report.quarter === current.quarter
    );
    if (previous && previous.value !== null && current.value !== null) {
      const change = current.value - previous.value;
      return { ...current, change: change.toFixed(2) };
    }
    return { ...current, change: null };
  });

  const marginYearlyChange = marginDataYearly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = marginDataYearly.find(report => report.year === previousYear);
    if (previous) {
      const change = current.value - previous.value;
      return { ...current, change: change.toFixed(2) };
    }
    return { ...current, change: null };
  });

  // EPS-data (kvartalsvis) med omvandling från EUR till SEK
  const epsDataQuarterlyRaw = financialReports.financialReports
    .filter(report => {
      const year = report.year;
      const quarter = report.quarter;
      if (year < 2015 || year > 2025) return false;
      if (year === 2015 && quarter !== "Q1") return false;
      if (year === 2025 && quarter !== "Q1") return false;
      return true;
    })
    .map(report => ({
      date: `${report.year} ${report.quarter}`,
      year: report.year,
      quarter: report.quarter,
      value: exchangeRate ? (report.adjustedEarningsPerShare || 0) * exchangeRate : 0,
    }));

  const epsDataQuarterly = allQuarters.map(({ date, year, quarter }) => {
    const existing = epsDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  });

  const years = [...new Set(financialReports.financialReports.map(report => report.year))].filter(year => year >= 2015);

  const epsDataYearly = [];
  years.forEach(year => {
    const yearlyReports = financialReports.financialReports.filter(report => report.year === year);
    const totalEPS = yearlyReports.reduce((sum, report) => sum + (report.adjustedEarningsPerShare || 0), 0);
    epsDataYearly.push({
      date: `${year} Helår`,
      year: year,
      value: exchangeRate ? totalEPS * exchangeRate : 0,
    });
  });

  const quarterlyGrowth = epsDataQuarterly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = epsDataQuarterly.find(
      report => report.year === previousYear && report.quarter === current.quarter
    );
    if (previous && previous.value !== null && current.value !== null && previous.value !== 0) {
      const growth = ((current.value - previous.value) / previous.value) * 100;
      return { ...current, growth: growth.toFixed(2) };
    }
    return { ...current, growth: null };
  });

  const yearlyGrowth = epsDataYearly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = epsDataYearly.find(report => report.year === previousYear);
    if (previous && previous.value !== 0) {
      const growth = ((current.value - previous.value) / previous.value) * 100;
      return { ...current, growth: growth.toFixed(2) };
    }
    return { ...current, growth: null };
  });

  // LiveCasino vs RNG-data med tillväxt, exkludera tomma kvartal
  const liveCasinoRngDataQuarterlyRaw = filteredFinancialReports
    .filter(report => report.year >= 2015)
    .map(report => ({
      date: `${report.year} ${report.quarter}`,
      year: report.year,
      quarter: report.quarter,
      liveCasino: report.liveCasino || 0,
      rng: report.rng || 0,
    }))
    .filter(item => item.liveCasino > 0 || item.rng > 0); // Filtrera bort tomma kvartal

  const liveCasinoRngDataYearly = [];
  const liveCasinoRngYears = [...new Set(liveCasinoRngDataQuarterlyRaw.map(item => item.year))];
  liveCasinoRngYears.forEach(year => {
    const yearlyReports = liveCasinoRngDataQuarterlyRaw.filter(report => report.year === year);
    const totalLiveCasino = yearlyReports.reduce((sum, report) => sum + (report.liveCasino || 0), 0);
    const totalRng = yearlyReports.reduce((sum, report) => sum + (report.rng || 0), 0);
    if (totalLiveCasino > 0 || totalRng > 0) {
      liveCasinoRngDataYearly.push({
        date: `${year} Helår`,
        year: year,
        liveCasino: totalLiveCasino,
        rng: totalRng,
      });
    }
  });

  const liveCasinoRngQuarterlyGrowth = liveCasinoRngDataQuarterlyRaw.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = liveCasinoRngDataQuarterlyRaw.find(
      report => report.year === previousYear && report.quarter === current.quarter
    );
    if (previous && (current.liveCasino > 0 || current.rng > 0)) {
      const liveCasinoGrowth = previous.liveCasino !== 0
        ? ((current.liveCasino - previous.liveCasino) / previous.liveCasino) * 100
        : null;
      const rngGrowth = previous.rng !== 0
        ? ((current.rng - previous.rng) / previous.rng) * 100
        : null;
      return {
        ...current,
        liveCasinoGrowth: liveCasinoGrowth ? liveCasinoGrowth.toFixed(2) : null,
        rngGrowth: rngGrowth ? rngGrowth.toFixed(2) : null,
      };
    }
    return { ...current, liveCasinoGrowth: null, rngGrowth: null };
  });

  const liveCasinoRngYearlyGrowth = liveCasinoRngDataYearly.map((current, index) => {
    const previousYear = current.year - 1;
    const previous = liveCasinoRngDataYearly.find(report => report.year === previousYear);
    if (previous) {
      const liveCasinoGrowth = previous.liveCasino !== 0
        ? ((current.liveCasino - previous.liveCasino) / previous.liveCasino) * 100
        : null;
      const rngGrowth = previous.rng !== 0
        ? ((current.rng - previous.rng) / previous.rng) * 100
        : null;
      return {
        ...current,
        liveCasinoGrowth: liveCasinoGrowth ? liveCasinoGrowth.toFixed(2) : null,
        rngGrowth: rngGrowth ? rngGrowth.toFixed(2) : null,
      };
    }
    return { ...current, liveCasinoGrowth: null, rngGrowth: null };
  });

  // Beräkna Y-axelns domän och tick-intervall för olika grafer
  const getYDomainAndTicks = (data, key, minValue = 0, secondaryKey = null, isMargin = false, isEPS = false) => {
    if (!data || data.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  
    // Samla alla relevanta värden från datan
    const values = data.map(item => item[key]).filter(val => val !== null && !isNaN(val));
    const secondaryValues = secondaryKey
      ? data.map(item => item[secondaryKey]).filter(val => val !== null && !isNaN(val))
      : [];
    const allValues = [...values, ...secondaryValues];
    if (allValues.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  
    // Beräkna min- och maxvärden
    const minVal = Math.min(...allValues, minValue);
    const maxVal = Math.max(...allValues);
  
    let roundedMin, roundedMax, tickInterval;
  
    if (isEPS) {
      // För Intjäning per aktie (EPS)
      roundedMin = Math.floor(minVal); // Startar från närmaste heltal nedåt
      const maxWithMargin = maxVal * 1.05; // Lägg till 5% marginal över högsta värdet
      roundedMax = Math.ceil(maxWithMargin); // Rundar upp till närmaste heltal
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 5 ? 1 : range <= 10 ? 2 : Math.ceil(range / 5); // Välj ett passande intervall
      roundedMax = Math.ceil(maxWithMargin / tickInterval) * tickInterval; // Justera max till en multipel av tickInterval
    } else if (isMargin) {
      // För Marginal
      roundedMin = Math.floor(minVal / 5) * 5; // Rundar ner till närmaste 5
      const maxWithMargin = maxVal * 1.05; // Lägg till 5% marginal över högsta värdet
      roundedMax = Math.ceil(maxWithMargin / 5) * 5; // Rundar upp till närmaste 5
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 20 ? 5 : 10; // Steg om 5 eller 10
    } else {
      // För Omsättning och LiveCasino vs RNG
      roundedMin = Math.floor(minVal / 50) * 50; // Rundar ner till närmaste 50
      const maxWithMargin = maxVal * 1.05; // Lägg till 5% marginal över högsta värdet
      roundedMax = Math.ceil(maxWithMargin / 50) * 50; // Rundar upp till närmaste 50
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 200 ? 50 : range <= 500 ? 100 : 200; // Steg om 50, 100 eller 200
    }
  
    // Skapa ticks med jämna mellanrum
    const ticks = [];
    for (let i = roundedMin; i <= roundedMax; i += tickInterval) {
      ticks.push(i);
    }
  
    // Domänen sätts till exakt min och max ticks
    return {
      domain: [ticks[0], ticks[ticks.length - 1]],
      ticks,
    };
  };

  const revenueQuarterlyYConfig = getYDomainAndTicks(revenueQuarterlyGrowth, 'value');
  const revenueYearlyYConfig = getYDomainAndTicks(revenueDataYearly, 'value');
  const marginQuarterlyYConfig = getYDomainAndTicks(marginQuarterlyChange, 'value', 0, null, true); // Lägg till isMargin
  const marginYearlyYConfig = getYDomainAndTicks(marginDataYearly, 'value', 0, null, true); // Lägg till isMargin
  const epsQuarterlyYConfig = getYDomainAndTicks(quarterlyGrowth, 'value', 0, null, false, true); // Lägg till isEPS
  const epsYearlyYConfig = getYDomainAndTicks(yearlyGrowth, 'value', 0, null, false, true); // Lägg till isEPS
  const liveCasinoRngQuarterlyYConfig = getYDomainAndTicks(
    liveCasinoRngQuarterlyGrowth,
    'liveCasino',
    0,
    'rng'
  );
  const liveCasinoRngYearlyYConfig = getYDomainAndTicks(
    liveCasinoRngDataYearly,
    'liveCasino',
    0,
    'rng'
  );

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

  const formatEPSTick = (value) => {
    return `${value.toFixed(2)} SEK`;
  };

  const quarterlyTicks = liveCasinoRngQuarterlyGrowth
    .filter((_, index) => index % 4 === 0)
    .map(item => item.date);

  const yearlyTicks = liveCasinoRngDataYearly.map(item => item.date);

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
          <MenuItem value="revenue">Omsättning</MenuItem>
          <MenuItem value="margin">Marginal</MenuItem>
          <MenuItem value="eps">Intjäning per aktie</MenuItem>
          <MenuItem value="dividend">Utdelning</MenuItem>
          <MenuItem value="players">AVG Spelare</MenuItem>
          <MenuItem value="geoDistribution">Geografisk fördelning</MenuItem>
          <MenuItem value="liveCasinoRng">LiveCasino vs RNG</MenuItem>
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
            <Tab label="Omsättning" value="revenue" />
            <Tab label="Marginal" value="margin" />
            <Tab label="Intjäning per aktie" value="eps" />
            <Tab label="Utdelning" value="dividend" />
            <Tab label="AVG Spelare" value="players" />
            <Tab label="Geografisk fördelning" value="geoDistribution" />
            <Tab label="LiveCasino vs RNG" value="liveCasinoRng" />
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

          {viewMode === "quarterly" && revenueQuarterlyGrowth.length > 0 && (
            (() => {
              const validQuarters = revenueQuarterlyGrowth.filter(item => item.value !== null);
              const latestQuarter = validQuarters[validQuarters.length - 1];
              if (latestQuarter && latestQuarter.growth) {
                return (
                  <Typography
                    variant="body1"
                    color={latestQuarter.growth >= 0 ? "#00e676" : "#ff1744"}
                    sx={{
                      marginBottom: "10px",
                      textAlign: "center",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    Ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.growth}%
                  </Typography>
                );
              }
              return null;
            })()
          )}

          {viewMode === "yearly" && revenueYearlyGrowth.length > 0 && revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth && (
            <Typography
              variant="body1"
              color={revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "10px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Tillväxt jämfört med {revenueYearlyGrowth[revenueYearlyGrowth.length - 1].year - 1}: {revenueYearlyGrowth[revenueYearlyGrowth.length - 1].growth}%
            </Typography>
          )}

          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={viewMode === "quarterly" ? revenueQuarterlyGrowth : revenueYearlyGrowth}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
              connectNulls={false}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                stroke="#ccc"
                ticks={viewMode === "quarterly" ? allQuarters.filter((_, index) => index % 4 === 0).map(item => item.date) : years.map(year => `${year} Helår`)}
                interval={0}
              >
                {!isMobile && (
                  <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                tickFormatter={formatRevenueTick}
                width={isMobile ? 40 : 60}
                domain={viewMode === "quarterly" ? revenueQuarterlyYConfig.domain : revenueYearlyYConfig.domain}
                ticks={viewMode === "quarterly" ? revenueQuarterlyYConfig.ticks : revenueYearlyYConfig.ticks}
              >
                {!isMobile && (
                  <Label
                    value="Omsättning (MEUR)"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <Tooltip
                formatter={(value, name, props) => {
                  const growth = props.payload.growth;
                  return [
                    value !== null
                      ? `${value.toLocaleString("sv-SE")} MEUR`
                      : "Ingen data",
                    growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig",
                  ];
                }}
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

          {viewMode === "quarterly" && marginQuarterlyChange.length > 0 && (
            (() => {
              const validQuarters = marginQuarterlyChange.filter(item => item.value !== null);
              const latestQuarter = validQuarters[validQuarters.length - 1];
              if (latestQuarter && latestQuarter.change) {
                return (
                  <Typography
                    variant="body1"
                    color={latestQuarter.change >= 0 ? "#00e676" : "#ff1744"}
                    sx={{
                      marginBottom: "10px",
                      textAlign: "center",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    Förändring jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.change >= 0 ? "+" : ""}{latestQuarter.change} procentenheter
                  </Typography>
                );
              }
              return null;
            })()
          )}

          {viewMode === "yearly" && marginYearlyChange.length > 0 && marginYearlyChange[marginYearlyChange.length - 1].change && (
            <Typography
              variant="body1"
              color={marginYearlyChange[marginYearlyChange.length - 1].change >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "10px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Förändring jämfört med {marginYearlyChange[marginYearlyChange.length - 1].year - 1}: {marginYearlyChange[marginYearlyChange.length - 1].change >= 0 ? "+" : ""}{marginYearlyChange[marginYearlyChange.length - 1].change} procentenheter
            </Typography>
          )}

          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart
              data={viewMode === "quarterly" ? marginQuarterlyChange : marginYearlyChange}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
              connectNulls={false}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                stroke="#ccc"
                ticks={viewMode === "quarterly" ? allQuarters.filter((_, index) => index % 4 === 0).map(item => item.date) : years.map(year => `${year} Helår`)}
                interval={0}
              >
                {!isMobile && (
                  <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={viewMode === "quarterly" ? marginQuarterlyYConfig.domain : marginYearlyYConfig.domain}
                ticks={viewMode === "quarterly" ? marginQuarterlyYConfig.ticks : marginYearlyYConfig.ticks}
                tickFormatter={formatMarginTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Marginal (%)"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <Tooltip
                formatter={(value, name, props) => {
                  const change = props.payload.change;
                  return [
                    value !== null
                      ? `${value.toLocaleString("sv-SE")}%`
                      : "Ingen data",
                    change ? `Förändring: ${change >= 0 ? "+" : ""}${change} procentenheter` : "Ingen jämförelse tillgänglig",
                  ];
                }}
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

      {/* Intjäning per aktie (EPS) */}
      {activeTab === "eps" && (
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
            {viewMode === "quarterly" ? "Intjäning per aktie per kvartal" : "Intjäning per aktie per helår"}
          </Typography>

          {viewMode === "quarterly" && quarterlyGrowth.length > 0 && (
            (() => {
              const validQuarters = quarterlyGrowth.filter(item => item.value !== null);
              const latestQuarter = validQuarters[validQuarters.length - 1];
              if (latestQuarter && latestQuarter.growth) {
                return (
                  <Typography
                    variant="body1"
                    color={latestQuarter.growth >= 0 ? "#00e676" : "#ff1744"}
                    sx={{
                      marginBottom: "10px",
                      textAlign: "center",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    Ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.growth}%
                  </Typography>
                );
              }
              return null;
            })()
          )}

          {viewMode === "yearly" && yearlyGrowth.length > 0 && yearlyGrowth[yearlyGrowth.length - 1].growth && (
            <Typography
              variant="body1"
              color={yearlyGrowth[yearlyGrowth.length - 1].growth >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "10px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Tillväxt jämfört med {yearlyGrowth[yearlyGrowth.length - 1].year - 1}: {yearlyGrowth[yearlyGrowth.length - 1].growth}%
            </Typography>
          )}

          {exchangeRate ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart
                data={viewMode === "quarterly" ? quarterlyGrowth : yearlyGrowth}
                margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
                connectNulls={false}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  ticks={viewMode === "quarterly" ? allQuarters.filter((_, index) => index % 4 === 0).map(item => item.date) : years.map(year => `${year} Helår`)}
                  interval={0}
                >
                  {!isMobile && (
                    <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tickFormatter={formatEPSTick}
                  width={isMobile ? 40 : 60}
                  domain={viewMode === "quarterly" ? epsQuarterlyYConfig.domain : epsYearlyYConfig.domain}
                  ticks={viewMode === "quarterly" ? epsQuarterlyYConfig.ticks : epsYearlyYConfig.ticks}
                >
                  {!isMobile && (
                    <Label
                      value="Intjäning per aktie (SEK)"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  formatter={(value, name, props) => {
                    const growth = props.payload.growth;
                    return [
                      value !== null
                        ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
                        : "Ingen data",
                      growth ? `Ökning: ${growth}%` : "Ingen jämförelse tillgänglig",
                    ];
                  }}
                  contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#00e676"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#00e676" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{ textAlign: "center", marginBottom: "20px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Laddar växelkurs...
            </Typography>
          )}
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
            {priceError && (
              <Typography
                variant="body2"
                color="#ff1744"
                sx={{ marginBottom: "10px", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                {priceError}
              </Typography>
            )}
            {loadingPrice ? (
              <Typography
                variant="body1"
                color="#ccc"
                sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
              >
                Laddar aktiepris...
              </Typography>
            ) : (
              <>
                {lastUpdated && (
                  <Typography
                    variant="body2"
                    color="#ccc"
                    sx={{ marginBottom: "10px", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                  >
                    Senast uppdaterad: {lastUpdated.toLocaleTimeString("sv-SE")}
                  </Typography>
                )}
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
                {dividendGrowth && (
                  <>
                    <Typography
                      variant="body1"
                      color={dividendGrowth.dividendGrowth >= 0 ? "#00e676" : "#ff1744"}
                      sx={{ marginTop: "10px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      Ökning av utdelning ({dividendGrowth.latestDate} vs {dividendGrowth.previousDate}): {dividendGrowth.dividendGrowth}%
                    </Typography>
                    <Typography
                      variant="body1"
                      color={dividendGrowth.yieldGrowth >= 0 ? "#00e676" : "#ff1744"}
                      sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      Ökning av direktavkastning: {dividendGrowth.yieldGrowth}%
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
                      X-dag: {planned[0].exDate} | Utdelningsdag: {planned[0].date} | Planerad utdelning: {planned[0].dividendPerShare.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK | Direktavkastning: {plannedYield.toFixed(2)}% (baserat på nuvarande kurs {currentSharePrice ? currentSharePrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A"} SEK)
                    </Typography>
                  </>
                )}
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
                {!isMobile && (
                  <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                )}
              </XAxis>
              <YAxis
                yAxisId="left"
                stroke="#ccc"
                tickFormatter={formatDividendTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Utdelning (SEK)"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ccc"
                tickFormatter={formatDividendYieldTick}
                width={isMobile ? 40 : 60}
              >
                {!isMobile && (
                  <Label
                    value="Direktavkastning (%)"
                    angle={90}
                    offset={-10}
                    position="insideRight"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
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
            <Table sx={{ backgroundColor: "#2e2e2e", borderRadius: "8px", minWidth: isMobile ? "450px" : "auto" }}>
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
                {!isMobile && (
                  <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                )}
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getPlayersYDomain(playersData)}
                tickFormatter={formatPlayersTick}
                width={isMobile ? 40 : 60}
                tickCount={9}
                interval={0}
              >
                {!isMobile && (
                  <Label
                    value="Antal spelare"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
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

          {uniqueYears.length > 0 ? (
            <>
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
            </>
          ) : (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{ textAlign: "center", marginBottom: "20px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Ingen geografisk data tillgänglig.
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

          {viewMode === "quarterly" && liveCasinoRngQuarterlyGrowth.length > 0 && (
            (() => {
              const validQuarters = liveCasinoRngQuarterlyGrowth.filter(item => item.liveCasino !== null && item.rng !== null);
              const latestQuarter = validQuarters[validQuarters.length - 1];
              if (latestQuarter) {
                return (
                  <>
                    {latestQuarter.liveCasinoGrowth && (
                      <Typography
                        variant="body1"
                        color={latestQuarter.liveCasinoGrowth >= 0 ? "#00e676" : "#ff1744"}
                        sx={{
                          marginBottom: "5px",
                          textAlign: "center",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                        }}
                      >
                        LiveCasino ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.liveCasinoGrowth}%
                      </Typography>
                    )}
                    {latestQuarter.rngGrowth && (
                      <Typography
                        variant="body1"
                        color={latestQuarter.rngGrowth >= 0 ? "#00e676" : "#ff1744"}
                        sx={{
                          marginBottom: "10px",
                          textAlign: "center",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                        }}
                      >
                        RNG ökning jämfört med {latestQuarter.year - 1} {latestQuarter.quarter}: {latestQuarter.rngGrowth}%
                      </Typography>
                    )}
                  </>
                );
              }
              return null;
            })()
          )}

          {viewMode === "yearly" && liveCasinoRngYearlyGrowth.length > 0 && (
            (() => {
              const latestYear = liveCasinoRngYearlyGrowth[liveCasinoRngYearlyGrowth.length - 1];
              if (latestYear) {
                return (
                  <>
                    {latestYear.liveCasinoGrowth && (
                      <Typography
                        variant="body1"
                        color={latestYear.liveCasinoGrowth >= 0 ? "#00e676" : "#ff1744"}
                        sx={{
                          marginBottom: "5px",
                          textAlign: "center",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                        }}
                      >
                        LiveCasino tillväxt jämfört med {latestYear.year - 1}: {latestYear.liveCasinoGrowth}%
                      </Typography>
                    )}
                    {latestYear.rngGrowth && (
                      <Typography
                        variant="body1"
                        color={latestYear.rngGrowth >= 0 ? "#00e676" : "#ff1744"}
                        sx={{
                          marginBottom: "10px",
                          textAlign: "center",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                        }}
                      >
                        RNG tillväxt jämfört med {latestYear.year - 1}: {latestYear.rngGrowth}%
                      </Typography>
                    )}
                  </>
                );
              }
              return null;
            })()
          )}

          {liveCasinoRngDataQuarterlyRaw.length > 0 || liveCasinoRngDataYearly.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart
                data={viewMode === "quarterly" ? liveCasinoRngQuarterlyGrowth : liveCasinoRngYearlyGrowth}
                margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  ticks={viewMode === "quarterly" ? quarterlyTicks : yearlyTicks}
                  interval={0}
                >
                  {!isMobile && (
                    <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  tickFormatter={formatLiveCasinoRngTick}
                  width={isMobile ? 40 : 60}
                  domain={viewMode === "quarterly" ? liveCasinoRngQuarterlyYConfig.domain : liveCasinoRngYearlyYConfig.domain}
                  ticks={viewMode === "quarterly" ? liveCasinoRngQuarterlyYConfig.ticks : liveCasinoRngYearlyYConfig.ticks}
                >
                  {!isMobile && (
                    <Label
                      value="Intäkter (MEUR)"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  formatter={(value, name, props) => {
                    const liveCasinoGrowth = props.payload.liveCasinoGrowth;
                    const rngGrowth = props.payload.rngGrowth;
                    return [
                      value !== null
                        ? `${value.toLocaleString("sv-SE")} MEUR`
                        : "Ingen data",
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