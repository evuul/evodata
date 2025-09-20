"use client";

import Header from "../Components/Header";
// import PlayerCard from "../Components/PlayerCard";
import dynamic from "next/dynamic";
import { Card, CardContent, Skeleton, Typography } from "@mui/material";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import LiveEarningsBox from "../Components/LiveEarningsBox";
import InvestmentCalculator from "../Components/InvestmentCalculator";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json";
// import KingsOfTheHillTeaser from "@/Components/KingsOfTheHillTeaser";
import CurrentCashBox from "../Components/CurrentCashBox";
import AveragePlayersTracker from "../Components/AveragePlayersTracker";
import IntelligenceIncomeReport from "../Components/IntelligenceIncomeReport";
import { Box } from "@mui/material";
import NewsSection from "../Components/NewsSection";
import FAQ from "../Components/FAQ";
import Footer from "../Components/Footer";
// import { Kings } from "next/font/google";

// Laddningsskelett för tunga komponenter
const GraphBoxSkeleton = () => (
  <Card
    sx={{
      background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: { xs: "12px", sm: "16px" },
      width: { xs: "92%", sm: "85%", md: "75%" },
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
      width: { xs: "92%", sm: "85%", md: "75%" },
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
const SAFE_PLAYER_COUNT = 0;

export default function Home() {
  // *** Allt API-anrop borttaget ***
  // Om/när du vill slå på igen:
  //  - gör Home async
  //  - hämta data
  //  - rendera komponenter villkorligt

  return (
    <main>
      {/* <KingsOfTheHillTeaser gameShowsData={playerData?.gameShows} /> */}
      <Header />

      {/* Container för PlayerCard, LiveEarningsBox och MoneyCounter */}
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
        {/* PlayerCard helt borttagen för att undvika beroende av API */}
        {/*
        <Box ...>
          <PlayerCard playerCount={playerData.playersCount} />
        </Box>
        */}

        {/* LiveEarningsBox – får ett säkert defaultvärde */}
        {/* <Box
          sx={{
            flex: { xs: "1 1 100%", sm: "1 1 100%" },
            width: { xs: "95%", sm: "85%", md: "75%" },
            margin: "0 auto",
            boxSizing: "border-box",
            order: { xs: 2, sm: "3" },
          }}
        >
          <LiveEarningsBox playerCount={SAFE_PLAYER_COUNT} /> */}
          {/* Om komponenten inte kräver prop: <LiveEarningsBox /> */}
        {/* </Box> */}

        {/* MoneyCounter */}
        <Box
          sx={{
            width: { xs: "95%", sm: "85%", md: "75%" },
            margin: "0 auto",
            boxSizing: "border-box",
            order: { xs: 3, sm: 2 },
          }}
        >
          <MoneyCounter />
        </Box>
      </Box>

      {/* GraphBox */}
      <Box id="overview"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
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
      </Box>

      {/* NewsSection (NYHETER) */}
      <Box id="news"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <NewsSection />
      </Box>

      {/* Short interest / Blankning temporärt dold (visas i Header med 5.15%) */}

            {/* StockBuybackInfo */}
            <Box id="buybacks"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <StockBuybackInfo isActive={true} buybackCash={500000000} dividendData={dividendData} />
      </Box>

      {/* AveragePlayersTracker */}
      {/* <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <AveragePlayersTracker playersData={averagePlayersData} />
      </Box> */}

      {/* InvestmentCalculator */}
      <Box id="calculator"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <InvestmentCalculator dividendData={dividendData} />
      </Box>

      {/* FAQ - längst ner på sidan */}
      <Box id="faq"
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
          mb: { xs: 4, sm: 6 },
        }}
      >
        <FAQ />
      </Box>

      {/* CurrentCashBox – du kan slå på när du vill */}
      {/*
      <Box sx={{ marginTop: { xs: 2, sm: 3 }, width: { xs: "95%", sm: "85%", md: "75%" }, margin: "0 auto" }}>
        <CurrentCashBox financialReports={financialReports} />
      </Box>
      */}

      {/* IntelligenceIncomeReport */}
      {/* <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <IntelligenceIncomeReport financialReports={financialReports} averagePlayersData={averagePlayersData} />
      </Box> */}

      {/* ComingUpdates */}
      {/*
      <Box sx={{ marginTop: { xs: 2, sm: 3 }, width: { xs: "95%", sm: "85%", md: "75%" }, margin: "0 auto" }}>
        <ComingUpdates />
      </Box>
      */}
      {/* Footer */}
      <Footer />
    </main>
  );
}
