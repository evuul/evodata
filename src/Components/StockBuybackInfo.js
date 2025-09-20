'use client';
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  Tabs,
  Tab,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
// Charts are rendered inside subcomponents; no direct Recharts import needed here
import { keyframes } from "@emotion/react";
import buybackData from "../app/data/buybackData.json"; // Nuvarande återköp för "Återköpsstatus"-fliken
import oldBuybackData from "../app/data/oldBuybackData.json"; // Historiska och nuvarande återköp för övriga flikar
import { useStockPriceContext } from '../context/StockPriceContext';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useRouter, useSearchParams } from 'next/navigation';
import ReturnsView from './buybacks/ReturnsView';
import WeeklyBuybacksTable from './buybacks/WeeklyBuybacksTable';
import OwnershipView from './buybacks/OwnershipView';
import TotalSharesView from './buybacks/TotalSharesView';
import HistoryView from './buybacks/HistoryView';
import {
  totalSharesData,
  calculateEvolutionOwnershipPerYear,
  calculateCancelledShares,
  calculateShareholderReturns,
  buybackDataForGraphDaily as buildDaily,
  buybackDataForGraphWeekly as buildWeekly,
  buybackDataForGraphMonthly as buildMonthly,
  buybackDataForGraphYearly as buildYearly,
  getLastWeekBuybacks,
  getPreviousWeekBuybacks,
  calculateBuybackStats,
  calculateAverageDailyBuyback,
  calculateEstimatedCompletion,
} from './buybacks/utils';

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

const buybackDataDaily = buildDaily(oldBuybackData);


const StockBuybackInfo = ({
  isActive,
  buybackCash,
  dividendData,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Init from URL
  useEffect(() => {
    const urlTab = searchParams?.get('bbTab');
    const urlView = searchParams?.get('bbView');
    if (urlTab && tabsList.includes(urlTab)) setActiveTab(urlTab);
    if (urlView && ["daily","weekly","monthly","yearly"].includes(urlView)) setViewMode(urlView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrlParam = (key, value) => {
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set(key, value);
      const newUrl = `${window.location.pathname}?${sp.toString()}#buybacks`;
      router.replace(newUrl);
    } catch {}
  };

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
    updateUrlParam('bbTab', newValue);
  };

  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
    updateUrlParam('bbView', newValue);
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

  let stepSize = getDynamicStep(buybackDataDaily, "Antal_aktier", viewMode);

  const chartData = returnsData.map((item) => ({
    year: item.year === 2025 ? `${item.year} (pågående)` : item.year,
    dividends: item.dividends / 1000000,
    buybacks: item.buybacks / 1000000,
  }));

  const historyChartData = viewMode === "daily"
    ? buybackDataDaily
    : viewMode === "weekly"
    ? buildWeekly(oldBuybackData)
    : viewMode === "monthly"
    ? buildMonthly(oldBuybackData)
    : buildYearly(oldBuybackData);

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
              <WeeklyBuybacksTable lastWeek={lastWeek} prevWeek={prevWeek} deltaShares={deltaShares} isMobile={isMobile} />
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === "ownership" && (
        <OwnershipView
          isMobile={isMobile}
          evolutionOwnershipData={evolutionOwnershipData}
          ownershipPercentageData={ownershipPercentageData}
          latestEvolutionShares={latestEvolutionShares}
          latestOwnershipPercentage={latestOwnershipPercentage}
          cancelledShares={cancelledShares}
          chartTypeOwnership={chartTypeOwnership}
          onChangeChartTypeOwnership={handleChartTypeChange("ownership")}
          yDomain={getYDomain(evolutionOwnershipData, "shares")}
          yTicks={getYTickValues(evolutionOwnershipData, "shares", "yearly")}
          formatYAxisTick={formatYAxisTick}
        />
      )}

          {/* removed inline ownership UI (moved to OwnershipView) */}


      {activeTab === "totalShares" && (
        <TotalSharesView
          isMobile={isMobile}
          totalSharesData={totalSharesData}
          latestTotalShares={latestTotalShares}
          chartTypeTotalShares={chartTypeTotalShares}
          onChangeChartTypeTotalShares={handleChartTypeChange("totalShares")}
          yDomain={getYDomain(totalSharesData, "totalShares")}
          yTicks={getYTickValues(totalSharesData, "totalShares", "yearly")}
          formatYAxisTick={formatYAxisTick}
        />
      )}
          {/* removed inline totalShares UI (moved to TotalSharesView) */}

      {activeTab === "history" && (
        <HistoryView
          isMobile={isMobile}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          chartTypeHistory={chartTypeHistory}
          onChangeChartTypeHistory={handleChartTypeChange("history")}
          historyChartData={historyChartData}
          yDomain={getYDomain(historyChartData, "Antal_aktier")}
          yTicks={getYTickValues(historyChartData, "Antal_aktier", viewMode)}
          formatYAxisTick={formatYAxisTick}
          historicalAverageDailyBuyback={historicalAverageDailyBuyback}
          averageBuybackPrice={averageBuybackPrice}
          sortedData={sortedData}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}

      {activeTab === "returns" && (
        <ReturnsView
          isMobile={isMobile}
          chartData={chartData}
          totalReturns={totalReturns}
          totalDividends={totalDividends}
          totalBuybacks={totalBuybacks}
          loadingPrice={loadingPrice}
          directYieldPercentage={directYieldPercentage}
          marketCap={marketCap}
          latestYear={latestYear}
        />
      )}
    </Card>
  );
};

export default StockBuybackInfo;
