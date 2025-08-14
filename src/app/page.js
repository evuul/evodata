import Header from "../Components/Header";
// import PlayerCard from "../Components/PlayerCard";
import StockBuybackInfo from "../Components/StockBuybackInfo";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import GraphBox from "../Components/GraphBox";
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
// import { Kings } from "next/font/google";

// Debug
console.log("dividendData i page.js:", dividendData);
console.log("financialReports i page.js:", financialReports);

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

  annualRevenueData.push({ date: `${year} Helår`, value: totalRevenue });
  annualMarginData.push({ date: `${year} Helår`, value: averageMargin });
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
            flex: { xs: "1 1 100%", sm: "1 1 400px", md: "1 1 400px", lg: "1 1 600px" },
            width: { xs: "95%", sm: "auto" },
            minWidth: { xs: "auto", sm: "300px", md: "350px" },
            maxWidth: { xs: "100%", sm: "500px", md: "600px", lg: "650px" },
            margin: "0 auto",
            minHeight: { xs: "200px", sm: "120px", md: "150px" },
            boxSizing: "border-box",
            order: { xs: 3, sm: 2 },
          }}
        >
          <MoneyCounter />
        </Box>
      </Box>

      {/* GraphBox */}
      <Box
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

            {/* StockBuybackInfo */}
            <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <StockBuybackInfo isActive={true} buybackCash={500000000} dividendData={dividendData} />
      </Box>

      {/* AveragePlayersTracker */}
      <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <AveragePlayersTracker playersData={averagePlayersData} />
      </Box>

      {/* InvestmentCalculator */}
      <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <InvestmentCalculator dividendData={dividendData} />
      </Box>

      {/* CurrentCashBox – du kan slå på när du vill */}
      {/*
      <Box sx={{ marginTop: { xs: 2, sm: 3 }, width: { xs: "95%", sm: "85%", md: "75%" }, margin: "0 auto" }}>
        <CurrentCashBox financialReports={financialReports} />
      </Box>
      */}

      {/* IntelligenceIncomeReport */}
      <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <IntelligenceIncomeReport financialReports={financialReports} averagePlayersData={averagePlayersData} />
      </Box>

      {/* ComingUpdates */}
      {/*
      <Box sx={{ marginTop: { xs: 2, sm: 3 }, width: { xs: "95%", sm: "85%", md: "75%" }, margin: "0 auto" }}>
        <ComingUpdates />
      </Box>
      */}
    </main>
  );
}