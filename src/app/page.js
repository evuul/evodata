"use client";

import LiveHeader from "../Components/LiveHeader";
// import PlayerCard from "../Components/PlayerCard";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { Box, Card, CardContent, CircularProgress, Skeleton, Typography } from "@mui/material";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json";
import buybackData from "./data/buybackData.json";
import gameShowsPreview from "./data/gameShows.json";
import shortHistoryData from "./data/shortHistory.json";
import insiderTransactions from "./data/insiderTransactions.json";
import outstandingShares from "./data/amountOfShares.json";
import NewsSection from "../Components/NewsSection";
import LiveFAQ from "../Components/LiveFAQ";
import GamePlayersBox from "../Components/GamePlayersBox"; // 👈 NY
import FairValueCard from "../Components/FairValueCard";
import { useAuth } from "../context/AuthContext";
import LiveFooter from "../Components/LiveFooter";

// Laddningsskelett för tunga komponenter
const GraphBoxSkeleton = () => (
  <Card
    sx={{
      background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: { xs: "12px", sm: "16px" },
      width: "100%",
      maxWidth: "1200px",
      margin: "16px auto",
      minHeight: 220,
    }}
  >
    <CardContent>
      <Typography variant="h5" sx={{ color: "#fff", mb: 1 }}>Finansiell översikt</Typography>
      <Skeleton variant="rectangular" height={28} sx={{ mb: 2, bgcolor: "#2e2e2e" }} />
      <Skeleton variant="rectangular" height={180} sx={{ bgcolor: "#2a2a2a" }} />
    </CardContent>
  </Card>
);

const BuybackSkeleton = () => (
  <Card
    sx={{
      background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: { xs: "12px", sm: "16px" },
      width: "100%",
      maxWidth: "1200px",
      margin: "16px auto",
      minHeight: 220,
    }}
  >
    <CardContent>
      <Typography variant="h5" sx={{ color: "#fff", mb: 1 }}>Aktieåterköpsinformation</Typography>
      <Skeleton variant="rectangular" height={28} sx={{ mb: 2, bgcolor: "#2e2e2e" }} />
      <Skeleton variant="rectangular" height={180} sx={{ bgcolor: "#2a2a2a" }} />
    </CardContent>
  </Card>
);

// Dynamiska importer för bättre prestanda
const GraphBox = dynamic(() => import("../Components/GraphBox"), { ssr: false, loading: () => <GraphBoxSkeleton /> });
const StockBuybackInfo = dynamic(() => import("../Components/StockBuybackInfo"), { ssr: false, loading: () => <BuybackSkeleton /> });
const ShortIntellegence = dynamic(() => import("../Components/ShortIntellegence"), { ssr: false });
const InsiderTradesCard = dynamic(() => import("../Components/InsiderTradesCard"), { ssr: false });
const DailyInsightsPanel = dynamic(() => import("../Components/DailyInsightsPanel"), { ssr: false });
const SHOW_DAILY_INSIGHTS = false;
const SHOW_LIVE_SHOW_INTELLIGENCE = true;
const SHOW_FINANCIAL_INTELLIGENCE_CARD = true;

const LiveShowIntelligence = dynamic(() => import("../Components/LiveShowIntelligence"), {
  ssr: false,
  loading: () => (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        minHeight: 220,
      }}
    >
      <CardContent>
        <Typography variant="h5" sx={{ color: "#fff", mb: 1 }}>
          Live Show Intelligence
        </Typography>
        <Skeleton variant="rectangular" height={24} sx={{ mb: 1.5, bgcolor: "#2e2e2e" }} />
        <Skeleton variant="rectangular" height={180} sx={{ bgcolor: "#2a2a2a" }} />
      </CardContent>
    </Card>
  ),
});

const FinancialOverviewCard = dynamic(() => import("../Components/FinancialOverviewCard"), {
  ssr: false,
  loading: () => (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        minHeight: 220,
      }}
    >
      <CardContent>
        <Typography variant="h5" sx={{ color: "#fff", mb: 1 }}>
          Finansiell översikt
        </Typography>
        <Skeleton variant="rectangular" height={24} sx={{ mb: 1.5, bgcolor: "#2e2e2e" }} />
        <Skeleton variant="rectangular" height={180} sx={{ bgcolor: "#2a2a2a" }} />
      </CardContent>
    </Card>
  ),
});


// Kvartalsdata
const formattedRevenueData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.operatingRevenues,
}));

const formattedMarginData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.adjustedOperatingMargin,
}));

// Helårsdata
const annualRevenueData = [];
const annualMarginData = [];
const years = [...new Set(financialReports.financialReports.map((r) => r.year))];

years.forEach((year) => {
  const quarterly = financialReports.financialReports.filter((r) => r.year === year);
  const totalRevenue = quarterly.reduce((acc, r) => acc + r.operatingRevenues, 0);
  const averageMargin = quarterly.reduce((acc, r) => acc + r.adjustedOperatingMargin, 0) / quarterly.length;

  annualRevenueData.push({ date: `${year}`, value: totalRevenue });
  annualMarginData.push({ date: `${year}`, value: averageMargin });
});

// SAFE DEFAULT om du ändå vill visa något i LiveEarningsBox
function useInViewOnce(ref) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, visible]);

  return visible;
}

export default function Home() {
  const { isAuthenticated, initialized } = useAuth();
  const [showAuthenticatedContent, setShowAuthenticatedContent] = useState(false);
  const newsRef = useRef(null);
  const newsInView = useInViewOnce(newsRef);

  useEffect(() => {
    if (isAuthenticated) {
      const id = setTimeout(() => setShowAuthenticatedContent(true), 300);
      return () => clearTimeout(id);
    }
    setShowAuthenticatedContent(false);
  }, [isAuthenticated]);

  const renderAuthenticatedContent = () => (
    <>
      {SHOW_DAILY_INSIGHTS && <DailyInsightsPanel />}

      {/* Container: GamePlayersBox + MoneyCounter */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "stretch",
          flexWrap: "wrap",
          gap: { xs: "0px", sm: "20px", md: "0px" },
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0",
          marginTop: { xs: "10px", sm: "20px" },
          boxSizing: "border-box",
        }}
      >
        {/* 🔥 NY: Live-spelare per game show (ovanför MoneyCounter) */}
        {/* <Box id="live-games"
          sx={{
            width: { xs: "100%", sm: "90%", md: "90%" },
            maxWidth: "1200px",
            margin: "0 auto",
            boxSizing: "border-box",
            order: { xs: 1, sm: 1 },
          }}
        >
          <GamePlayersBox />
        </Box> */}

        {/* MoneyCounter */}
        {/* <Box id="money-counter"
          sx={{
            width: { xs: "100%", sm: "90%", md: "90%" },
            maxWidth: "1200px",
            margin: "0 auto",
            boxSizing: "border-box",
            order: { xs: 2, sm: 2 },
          }}
        >
          <MoneyCounter />
        </Box> */}
      </Box>

      {/* Fair Value */}
      {/* <Box id="fairvalue"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <FairValueCard reports={financialReports.financialReports} />
      </Box> */}

      {/* GraphBox */}
      {/* <Box id="overview"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <GraphBox
          revenueData={formattedRevenueData}
          marginData={formattedMarginData}
          annualRevenueData={annualRevenueData}
          annualMarginData={annualMarginData}
          playersData={averagePlayersData}
          dividendData={dividendData}
          financialReports={financialReports}
        />
      </Box> */}

      {/* {SHOW_FINANCIAL_INTELLIGENCE_CARD && (
        <Box
          sx={{
            marginTop: { xs: 2, sm: 3 },
            width: { xs: "100%", sm: "90%", md: "90%" },
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <FinancialOverviewCard
            financialReports={financialReports}
            dividendData={dividendData}
          />
        </Box>
      )}

      {SHOW_LIVE_SHOW_INTELLIGENCE && (
        <Box
          sx={{
            marginTop: { xs: 2, sm: 3 },
            width: { xs: "100%", sm: "90%", md: "90%" },
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <LiveShowIntelligence
            financialReports={financialReports}
            averagePlayersData={averagePlayersData}
          />
        </Box>
      )} */}

      {/* NewsSection (NYHETER) */}
      {/* <Box
        id="news"
        ref={newsRef}
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {newsInView && <NewsSection />}
      </Box> */}

      {/* Short interest trend
      <Box id="blankning"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <ShortIntellegence />
      </Box> */}

      {/* Insider trades */}
      {/* <Box id="insider"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <InsiderTradesCard />
      </Box> */}

      {/* StockBuybackInfo */}
      {/* <Box id="buybacks"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <StockBuybackInfo isActive={false} buybackCash={500000000} dividendData={dividendData} />
      </Box> */}

      {/* InvestmentCalculator */}
      {/* <Box id="calculator"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <InvestmentCalculator dividendData={dividendData} />
      </Box> */}

      {/* FAQ - längst ner på sidan */}
      {/* <Box id="faq"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "100%", sm: "90%", md: "90%" },
          maxWidth: "1200px",
          margin: "0 auto",
          mb: { xs: 4, sm: 6 },
        }}
      >
        <LiveFAQ />
        </Box> */}

      {/* <LiveFooter /> */}

    </>
  );

  if (!initialized) {
    return (
      <main>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main>
        <LiveLoggedOutPreview
          financialReports={financialReports}
          averagePlayersData={averagePlayersData}
          dividendData={dividendData}
          buybackData={buybackData}
          gameShowsData={gameShowsPreview}
          shortHistoryData={shortHistoryData}
          insiderTransactions={insiderTransactions}
          sharesData={outstandingShares}
        />
        {/* <LiveFooter /> */}
      </main>
    );
  }

  return (
    <main>
      <LiveHeader
        financialReports={financialReports}
        averagePlayersData={averagePlayersData}
        dividendData={dividendData}
        buybackData={buybackData}
        sharesData={outstandingShares}
      />

      {showAuthenticatedContent ? (
        renderAuthenticatedContent()
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40vh",
            color: "rgba(255,255,255,0.7)",
            gap: 1.5,
          }}
        >
          <CircularProgress size={28} sx={{ color: "#82c1ff" }} />
          <Typography variant="body2">Laddar dashboards …</Typography>
        </Box>
      )}
    </main>
  );
}
const LiveLoggedOutPreview = dynamic(() => import("../Components/LiveLoggedOutPreview"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress />
    </Box>
  ),
});
