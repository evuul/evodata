import Header from "../Components/Header";
import PlayerCard from "../Components/PlayerCard";
import StockBuybackInfo from "../Components/StockBuybackInfo";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import GraphBox from "../Components/GraphBox";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json"; // Importera dividendData
import { Box } from "@mui/material";

// Logga dividendData för att kontrollera att den importeras korrekt
console.log("dividendData i page.js:", dividendData);

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

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          gap: { xs: 2, md: 3 },
          padding: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ width: { xs: "100%", md: "48%" } }}>
          <PlayerCard playerCount={data.playersCount} />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "48%" } }}>
          <MoneyCounter />
        </Box>
      </Box>

      <Box sx={{ marginTop: 3 }}>
        <GraphBox
          revenueData={formattedRevenueData}
          marginData={formattedMarginData}
          annualRevenueData={annualRevenueData}
          annualMarginData={annualMarginData}
          playersData={averagePlayersData}
          dividendData={dividendData} // Skicka dividendData som prop
        />
      </Box>

      <Box sx={{ marginTop: 3 }}>
        <StockBuybackInfo
          isActive={true}
          buybackCash={500000000}
          sharesBought={2100081}
          averagePrice={809}
        />
      </Box>

      <ComingUpdates />
    </main>
  );
}