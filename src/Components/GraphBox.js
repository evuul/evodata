'use client';
import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography, Card, Tabs, Tab, Select, MenuItem, useMediaQuery, useTheme, IconButton } from "@mui/material";
import RevenueSection from "./graphs/RevenueSection";
import EPSSection from "./graphs/EPSSection";
import MarginSection from "./graphs/MarginSection";
import DividendSection from "./graphs/DividendSection";
import GeoDistributionSection from "./graphs/GeoDistributionSection";
import LiveCasinoRngSection from "./graphs/LiveCasinoRngSection";
import {
  makeFormatRevenueTick,
  makeFormatLiveCasinoRngTick,
  formatMarginTickSimple,
  formatDividendTickSimple,
  formatDividendYieldTickSimple,
  formatEPSTick as formatEPSTickUtil,
} from "./graphs/utils";
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
  exchangeRate: exchangeRateProp = 10.83,
}) => {
  const [activeTab, setActiveTab] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarterly");
  const [chartType, setChartType] = useState("line"); // För omsättning
  const [chartTypeEPS, setChartTypeEPS] = useState("line"); // För intjäning per aktie
  const [selectedGeoYear, setSelectedGeoYear] = useState(null);
  const [selectedGeoPeriod, setSelectedGeoPeriod] = useState("Helår");
  const [lastUpdated, setLastUpdated] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const today = new Date();

  const { stockPrice, loading: loadingPrice, error: priceError } = useStockPriceContext();

  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 0) : stockPrice?.price?.regularMarketPrice?.raw || 0;

  const exchangeRate = exchangeRateProp;

  useEffect(() => {
    if (stockPrice && !loadingPrice) {
      setLastUpdated(new Date());
    }
  }, [stockPrice, loadingPrice]);

  const tabsList = [
    "revenue",
    "margin",
    "eps",
    "dividend",
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

  const handleChartTypeChange = (event, newValue) => {
    setChartType(newValue);
  };

  const handleChartTypeEPSChange = (event, newValue) => {
    setChartTypeEPS(newValue);
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

  useEffect(() => {
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

  const allQuarters = useMemo(() => {
    const list = [];
    for (let year = 2015; year <= 2025; year++) {
      const quarters = year === 2015 ? ["Q1"] : ["Q1", "Q2", "Q3", "Q4"];
      quarters.forEach((quarter) => list.push({ year, quarter, date: `${year} ${quarter}` }));
    }
    return list;
  }, []);

  const revenueDataQuarterlyRaw = useMemo(() => revenueData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
    quarter: item.date.split(" ")[1],
  })), [revenueData]);

  const revenueDataQuarterly = useMemo(() => allQuarters.map(({ date, year, quarter }) => {
    const existing = revenueDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  }), [allQuarters, revenueDataQuarterlyRaw]);

  const revenueDataYearly = useMemo(() => annualRevenueData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
  })), [annualRevenueData]);

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

  const marginDataQuarterlyRaw = useMemo(() => marginData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
    quarter: item.date.split(" ")[1],
  })), [marginData]);

  const marginDataQuarterly = useMemo(() => allQuarters.map(({ date, year, quarter }) => {
    const existing = marginDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  }), [allQuarters, marginDataQuarterlyRaw]);

  const marginDataYearly = useMemo(() => annualMarginData.map(item => ({
    ...item,
    year: parseInt(item.date.split(" ")[0]),
  })), [annualMarginData]);

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

  const epsDataQuarterlyRaw = useMemo(() => financialReports.financialReports
    .filter(report => {
      const year = report.year;
      if (year < 2015) return false;
      return year <= 2025; // Allow all quarters for 2025
    })
    .map(report => ({
      date: `${report.year} ${report.quarter}`,
      year: report.year,
      quarter: report.quarter,
      value: exchangeRate ? (report.adjustedEarningsPerShare || 0) * exchangeRate : 0,
    })), [financialReports, exchangeRate]);

  const epsDataQuarterly = useMemo(() => allQuarters.map(({ date, year, quarter }) => {
    const existing = epsDataQuarterlyRaw.find(item => item.date === date);
    return existing || { date, year, quarter, value: null };
  }), [allQuarters, epsDataQuarterlyRaw]);

  const years = useMemo(() => [...new Set(financialReports.financialReports.map(report => report.year))].filter(year => year >= 2015), [financialReports]);

  const epsDataYearly = useMemo(() => {
    return years.map((year) => {
      const yearlyReports = financialReports.financialReports.filter((report) => report.year === year);
      const totalEPS = yearlyReports.reduce((sum, report) => sum + (report.adjustedEarningsPerShare || 0), 0);
      return {
        date: `${year}`,
        year,
        value: exchangeRate ? totalEPS * exchangeRate : 0,
      };
    });
  }, [years, financialReports, exchangeRate]);

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

  const liveCasinoRngDataQuarterlyRaw = filteredFinancialReports
    .filter(report => report.year >= 2015)
    .map(report => ({
      date: `${report.year} ${report.quarter}`,
      year: report.year,
      quarter: report.quarter,
      liveCasino: report.liveCasino || 0,
      rng: report.rng || 0,
    }))
    .filter(item => item.liveCasino > 0 || item.rng > 0);

  const liveCasinoRngDataYearly = [];
  const liveCasinoRngYears = [...new Set(liveCasinoRngDataQuarterlyRaw.map(item => item.year))];
  liveCasinoRngYears.forEach(year => {
    const yearlyReports = liveCasinoRngDataQuarterlyRaw.filter(report => report.year === year);
    const totalLiveCasino = yearlyReports.reduce((sum, report) => sum + (report.liveCasino || 0), 0);
    const totalRng = yearlyReports.reduce((sum, report) => sum + (report.rng || 0), 0);
    if (totalLiveCasino > 0 || totalRng > 0) {
      liveCasinoRngDataYearly.push({
        date: `${year}`,
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

  const getQuarterlyXTicks = (data) => {
    if (data.length <= 8) return data.map(item => item.date);
    const step = Math.floor(data.length / 6);
    return data
      .filter((_, index) => index % step === 0)
      .map(item => item.date);
  };

  const getYearlyXTicks = (data) => data.map(item => item.date);

  const revenueQuarterlyXTicks = getQuarterlyXTicks(revenueQuarterlyGrowth);
  const revenueYearlyXTicks = getYearlyXTicks(revenueYearlyGrowth);
  const marginQuarterlyXTicks = getQuarterlyXTicks(marginQuarterlyChange);
  const marginYearlyXTicks = getYearlyXTicks(marginYearlyChange);
  const epsQuarterlyXTicks = getQuarterlyXTicks(quarterlyGrowth);
  const epsYearlyXTicks = getYearlyXTicks(yearlyGrowth);

  const getYDomainAndTicks = (data, key, minValue = 0, secondaryKey = null, isMargin = false, isEPS = false) => {
    if (!data || data.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  
    const values = data.map(item => item[key]).filter(val => val !== null && !isNaN(val));
    const secondaryValues = secondaryKey
      ? data.map(item => item[secondaryKey]).filter(val => val !== null && !isNaN(val))
      : [];
    const allValues = [...values, ...secondaryValues];
    if (allValues.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  
    const minVal = Math.min(...allValues, minValue);
    const maxVal = Math.max(...allValues);
  
    let roundedMin, roundedMax, tickInterval;
  
    if (isEPS) {
      roundedMin = Math.floor(minVal);
      const maxWithMargin = maxVal * 1.05;
      roundedMax = Math.ceil(maxWithMargin);
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 5 ? 1 : range <= 10 ? 2 : Math.ceil(range / 5);
      roundedMax = Math.ceil(maxWithMargin / tickInterval) * tickInterval;
    } else if (isMargin) {
      roundedMin = Math.floor(minVal / 5) * 5;
      const maxWithMargin = maxVal * 1.05;
      roundedMax = Math.ceil(maxWithMargin / 5) * 5;
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 20 ? 5 : 10;
    } else {
      roundedMin = Math.floor(minVal / 50) * 50;
      const maxWithMargin = maxVal * 1.05;
      roundedMax = Math.ceil(maxWithMargin / 50) * 50;
  
      const range = roundedMax - roundedMin;
      tickInterval = range <= 200 ? 50 : range <= 500 ? 100 : 200;
    }
  
    const ticks = [];
    for (let i = roundedMin; i <= roundedMax; i += tickInterval) {
      ticks.push(i);
    }
  
    return {
      domain: [ticks[0], ticks[ticks.length - 1]],
      ticks,
    };
  };

  const revenueQuarterlyYConfig = getYDomainAndTicks(revenueQuarterlyGrowth, 'value');
  const revenueYearlyYConfig = getYDomainAndTicks(revenueDataYearly, 'value');
  const marginQuarterlyYConfig = getYDomainAndTicks(marginQuarterlyChange, 'value', 0, null, true);
  const marginYearlyYConfig = getYDomainAndTicks(marginDataYearly, 'value', 0, null, true);
  const epsQuarterlyYConfig = getYDomainAndTicks(quarterlyGrowth, 'value', 0, null, false, true);
  const epsYearlyYConfig = getYDomainAndTicks(yearlyGrowth, 'value', 0, null, false, true);
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

  // Tick-formatters via utils
  const formatRevenueTick = makeFormatRevenueTick(isMobile);
  const formatLiveCasinoRngTick = makeFormatLiveCasinoRngTick(isMobile);
  const formatMarginTick = formatMarginTickSimple;
  const formatDividendTick = formatDividendTickSimple;
  const formatDividendYieldTick = formatDividendYieldTickSimple;
  const formatEPSTick = formatEPSTickUtil;

  const quarterlyTicks = liveCasinoRngQuarterlyGrowth
    .filter((_, index) => index % 4 === 0)
    .map(item => item.date);

  const yearlyTicks = liveCasinoRngDataYearly.map(item => item.date);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        margin: "16px auto",
        width: { xs: "92%", sm: "85%", md: "75%" },
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: "12px",
          textAlign: "center",
          fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
          letterSpacing: "0.5px",
        }}
      >
        Finansiell översikt
      </Typography>

      {isMobile ? (
        <Select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          fullWidth
          sx={{
            color: "#b0b0b0",
            backgroundColor: "#2e2e2e",
            marginBottom: "12px",
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
                  color: "#b0b0b0",
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
          <MenuItem value="geoDistribution">Geografisk fördelning</MenuItem>
          <MenuItem value="liveCasinoRng">LiveCasino vs RNG</MenuItem>
        </Select>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
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
              color: "#b0b0b0",
              "& .MuiTab-root": {
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
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

      {activeTab === "revenue" && (
        <RevenueSection
          isMobile={isMobile}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          chartType={chartType}
          onChangeChartType={handleChartTypeChange}
          revenueQuarterlyGrowth={revenueQuarterlyGrowth}
          revenueYearlyGrowth={revenueYearlyGrowth}
          revenueQuarterlyXTicks={revenueQuarterlyXTicks}
          revenueYearlyXTicks={revenueYearlyXTicks}
          revenueQuarterlyYConfig={revenueQuarterlyYConfig}
          revenueYearlyYConfig={revenueYearlyYConfig}
          formatRevenueTick={formatRevenueTick}
        />
      )}

      

      {activeTab === "margin" && (
        <MarginSection
          isMobile={isMobile}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          marginQuarterlyChange={marginQuarterlyChange}
          marginYearlyChange={marginYearlyChange}
          marginQuarterlyXTicks={marginQuarterlyXTicks}
          marginYearlyXTicks={marginYearlyXTicks}
          marginQuarterlyYConfig={marginQuarterlyYConfig}
          marginYearlyYConfig={marginYearlyYConfig}
          formatMarginTick={formatMarginTick}
        />
      )}

      {activeTab === "eps" && (
        <EPSSection
          isMobile={isMobile}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          chartTypeEPS={chartTypeEPS}
          onChangeChartTypeEPS={handleChartTypeEPSChange}
          quarterlyGrowth={quarterlyGrowth}
          yearlyGrowth={yearlyGrowth}
          epsQuarterlyXTicks={epsQuarterlyXTicks}
          epsYearlyXTicks={epsYearlyXTicks}
          epsQuarterlyYConfig={epsQuarterlyYConfig}
          epsYearlyYConfig={epsYearlyYConfig}
          formatEPSTick={formatEPSTick}
        />
      )}

      {activeTab === "dividend" && (
        <DividendSection
          isMobile={isMobile}
          priceError={priceError}
          loadingPrice={loadingPrice}
          lastUpdated={lastUpdated}
          latestHistorical={latestHistorical}
          dividendGrowth={dividendGrowth}
          planned={planned}
          plannedYield={plannedYield}
          currentSharePrice={currentSharePrice}
          combinedDividendData={combinedDividendData}
          formatDividendTick={formatDividendTick}
          formatDividendYieldTick={formatDividendYieldTick}
        />
      )}

      {activeTab === "geoDistribution" && (
        <GeoDistributionSection
          isMobile={isMobile}
          uniqueYears={uniqueYears}
          selectedGeoYear={selectedGeoYear}
          selectedGeoPeriod={selectedGeoPeriod}
          availableQuarters={availableQuarters}
          onChangeYear={handleGeoYearChange}
          onChangePeriod={handleGeoPeriodChange}
          selectedGeoData={selectedGeoData}
          colors={COLORS}
        />
      )}
{/* LiveCasino vs RNG (Stacked Bar Chart) */}
{activeTab === "liveCasinoRng" && (
        <LiveCasinoRngSection
          isMobile={isMobile}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          liveCasinoRngQuarterlyGrowth={liveCasinoRngQuarterlyGrowth}
          liveCasinoRngYearlyGrowth={liveCasinoRngYearlyGrowth}
          quarterlyTicks={quarterlyTicks}
          yearlyTicks={yearlyTicks}
          liveCasinoRngQuarterlyYConfig={liveCasinoRngQuarterlyYConfig}
          liveCasinoRngYearlyYConfig={liveCasinoRngYearlyYConfig}
          formatLiveCasinoRngTick={formatLiveCasinoRngTick}
        />
      )}

      
    </Card>
  );
};

export default GraphBox;
