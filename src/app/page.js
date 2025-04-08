import Header from "../Components/Header";
import PlayerCard from "../Components/PlayerCard";
import StockBuybackInfo from "../Components/StockBuybackInfo";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import GraphBox from "../Components/GraphBox";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json";
import { Box } from "@mui/material";

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
  const response = await fetch(
    "https://generous-shelagh-khalid-organization-eb1285b3.koyeb.app/api/players/current",
    {
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBbGV4YW5kZXIuZWtAbGl2ZS5zZSIsImlhdCI6MTc0MzM2MDk1MywiZXhwIjoxNzQ1OTUyOTUzfQ.ve8DB7ND1_4ptX0oteIzF3fbVFxr9gIEqfi2uVPPZAU",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return <p>Kunde inte hämta datan</p>;
  }

  const data = await response.json();

  return (
    <main>
      <Header />

      {/* Container för PlayerCard och MoneyCounter */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center", // Centrera horisontellt
          alignItems: "stretch", // Säkerställ att de har samma höjd
          flexWrap: "wrap", // Låt dem gå till nästa rad på små skärmar
          gap: { xs: "15px", sm: "20px" }, // Avstånd mellan PlayerCard och MoneyCounter
          width: { xs: "95%", sm: "80%", md: "90%" }, // Samma bredd som GraphBox
          maxWidth: "1200px", // Sätt en maxbredd för att undvika att det blir för brett
          margin: "0 auto", // Centrera containern
          padding: { xs: "10px", sm: "20px" },
        }}
      >
        {/* PlayerCard */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 10px)" }, // 100% på xs, 50% minus halva gapet på sm och uppåt
            minWidth: { xs: "100%", sm: "300px" }, // Minsta bredd för att undvika att det blir för smalt
            maxWidth: { xs: "100%", sm: "calc(50% - 10px)" }, // Begränsa bredden
          }}
        >
          <PlayerCard playerCount={data.playersCount} />
        </Box>

        {/* MoneyCounter */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 10px)" }, // 100% på xs, 50% minus halva gapet på sm och uppåt
            minWidth: { xs: "100%", sm: "300px" }, // Minsta bredd för att undvika att det blir för smalt
            maxWidth: { xs: "100%", sm: "calc(50% - 10px)" }, // Begränsa bredden
          }}
        >
          <MoneyCounter />
        </Box>
      </Box>

      {/* GraphBox */}
      <Box sx={{ marginTop: { xs: 2, sm: 3 } }}>
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
      <Box sx={{ marginTop: { xs: 2, sm: 3 } }}>
        <StockBuybackInfo
          isActive={false}
          buybackCash={500000000}
          sharesBought={2100081}
          averagePrice={809}
          dividendData={dividendData}
        />
      </Box>

      {/* ComingUpdates */}
      <Box sx={{ marginTop: { xs: 2, sm: 3 } }}>
        <ComingUpdates />
      </Box>
    </main>
  );
}