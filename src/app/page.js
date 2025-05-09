import Header from "../Components/Header";
import PlayerCard from "../Components/PlayerCard";
import StockBuybackInfo from "../Components/StockBuybackInfo";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import GraphBox from "../Components/GraphBox";
import LiveEarningsBox from "../Components/LiveEarningsBox";
import InvestmentCalculator from "../Components/InvestmentCalculator";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json";
import KingsOfTheHillTeaser from "@/Components/KingsOfTheHillTeaser";
import CurrentCashBox from "../Components/CurrentCashBox";
import AveragePlayersTracker from "../Components/AveragePlayersTracker";
import IntelligenceIncomeReport from "../Components/IntelligenceIncomeReport";
import { Box } from "@mui/material";
import { Kings } from "next/font/google";

// Logga dividendData och financialReports för att kontrollera att de importeras korrekt
console.log("dividendData i page.js:", dividendData);
console.log("financialReports i page.js:", financialReports);

// Format för kvartalsdata (Omsättning och Marginal)
const formattedRevenueData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.operatingRevenues,
}));

const formattedMarginData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.adjustedOperatingMargin,
}));

// Här summerar vi alla kvartalsdata per år för att få helårsomsättningen och genomsnittlig marginal
const annualRevenueData = [];
const annualMarginData = [];
const years = [...new Set(financialReports.financialReports.map(report => report.year))];

years.forEach((year) => {
  const quarterlyRevenue = financialReports.financialReports.filter(report => report.year === year);
  const totalRevenue = quarterlyRevenue.reduce((acc, report) => acc + report.operatingRevenues, 0);

  const quarterlyMargins = financialReports.financialReports.filter(report => report.year === year);
  const averageMargin = quarterlyMargins.reduce((acc, report) => acc + report.adjustedOperatingMargin, 0) / quarterlyMargins.length;

  annualRevenueData.push({
    date: `${year} Helår`,
    value: totalRevenue,
  });

  annualMarginData.push({
    date: `${year} Helår`,
    value: averageMargin,
  });
});

export default async function Home() {
  // Hämta playerCount
  const playerResponse = await fetch(
    "https://generous-shelagh-khalid-organization-eb1285b3.koyeb.app/api/players/current",
    {
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBbGV4YW5kZXIuZWtAbGl2ZS5zZSIsImlhdCI6MTc0NTUxOTk2OCwiZXhwIjoxNzQ4MTExOTY4fQ.5cMwr6yP_0tvIkAE5w3E2E1Id3ssj3YON7jxsdMVVa4",
      },
      cache: "no-store",
    }
  );

  if (!playerResponse.ok) {
    return <p>Kunde inte hämta datan</p>;
  }

  const playerData = await playerResponse.json();

  return (
    <main>
      {/* <KingsOfTheHillTeaser gameShowsData={playerData.gameShows} /> */}
      <Header /> {/* Om Header också kan använda StockPriceContext, ta bort stockData och stockError här */}

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
        {/* PlayerCard */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", sm: "1 1 400px", md: "1 1 400px", lg: "1 1 600px" },
            width: { xs: "95%", sm: "auto" },
            minWidth: { xs: "auto", sm: "300px", md: "350px" },
            maxWidth: { xs: "100%", sm: "500px", md: "600px", lg: "650px" },
            margin: "0 auto",
            minHeight: { xs: "200px", sm: "120px", md: "150px" },
            boxSizing: "border-box",
            order: { xs: 1, sm: 1 },
          }}
        >
          <PlayerCard playerCount={playerData.playersCount} />
        </Box>

        {/* LiveEarningsBox */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", sm: "1 1 100%" },
            width: { xs: "95%", sm: "85%", md: "75%" },
            margin: "0 auto",
            boxSizing: "border-box",
            order: { xs: 2, sm: "3" },
          }}
        >
          <LiveEarningsBox playerCount={playerData.playersCount} />
        </Box>

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



      {/* CurrentCashBox */}
{/* <Box
  sx={{
    marginTop: { xs: 2, sm: 3 },
    width: { xs: "95%", sm: "85%", md: "75%" },
    margin: "0 auto",
  }}
>
  <CurrentCashBox financialReports={financialReports} />
</Box> */}

      {/* StockBuybackInfo */}
      <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <StockBuybackInfo
          isActive={true}
          buybackCash={500000000}
          sharesBought={2100081}
          averagePrice={809}
          dividendData={dividendData}
        />
      </Box>

      {/* IntelligenceIncomeReport */}
      <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <IntelligenceIncomeReport
          financialReports={financialReports}
          averagePlayersData={averagePlayersData}
        />
      </Box>

      {/* ComingUpdates */}
      {/* <Box
        sx={{
          marginTop: { xs: 2, sm: 3 },
          width: { xs: "95%", sm: "85%", md: "75%" },
          margin: "0 auto",
        }}
      >
        <ComingUpdates />
      </Box> */}
    </main>
  );
}