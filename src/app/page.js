import Header from "../Components/Header";
import PlayerCard from "../Components/PlayerCard";
import StockBuybackInfo from "../Components/StockBuybackInfo";
import MoneyCounter from "../Components/MoneyCounter";
import ComingUpdates from "../Components/ComingUpdates";
import GraphBox from "../Components/GraphBox";
import financialReports from "./data/financialReports.json"; // Se till att importera JSON-filen korrekt
import { Box } from "@mui/material";

// Format för kvartalsdata (Omsättning och Marginal)
const formattedRevenueData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.operatingRevenues,
}));

const formattedMarginData = financialReports.financialReports.map((report) => ({
  date: `${report.year} ${report.quarter}`,
  value: report.adjustedOperatingMargin, // Använder adjustedOperatingMargin som marginal
}));

// Här summerar vi alla kvartalsdata per år för att få helårsomsättningen och genomsnittlig marginal
const annualRevenueData = [];
const annualMarginData = [];
const years = [...new Set(financialReports.financialReports.map(report => report.year))];

years.forEach((year) => {
  // Summera kvartalsomsättningen för att få helårsomsättningen
  const quarterlyRevenue = financialReports.financialReports.filter(report => report.year === year);
  const totalRevenue = quarterlyRevenue.reduce((acc, report) => acc + report.operatingRevenues, 0);

  // Beräkna genomsnittlig marginal för helåret
  const quarterlyMargins = financialReports.financialReports.filter(report => report.year === year);
  const averageMargin = quarterlyMargins.reduce((acc, report) => acc + report.adjustedOperatingMargin, 0) / quarterlyMargins.length;

  // Lägg till summerad omsättning för helåret
  annualRevenueData.push({
    date: `${year} Helår`,
    value: totalRevenue, // Summerad omsättning för helåret
  });

  // Lägg till genomsnittlig marginal för helåret
  annualMarginData.push({
    date: `${year} Helår`,
    value: averageMargin, // Genomsnittlig marginal för helåret
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

      {/* Layout justering för att vara responsiv */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" }, // Stänger upp en kolumnlayout på mobil och radlayout på större skärmar
          justifyContent: "space-around", // Justerar innehållet
          gap: 2, // Lägg till mellanrum mellan komponenter
          height: "100%",
        }}
      >
        <Box sx={{ width: { xs: "100%", md: "48%" } }}>
          <PlayerCard playerCount={data.playersCount} />
        </Box>

        <Box sx={{ width: { xs: "100%", md: "48%" } }}>
          <MoneyCounter />
        </Box>
      </Box>

      <Box sx={{ height: "100%" }}>
        <GraphBox
          revenueData={formattedRevenueData} // Kvartalsdata för omsättning
          marginData={formattedMarginData}   // Kvartalsdata för marginal
          annualRevenueData={annualRevenueData} // Helårsdata för omsättning
          annualMarginData={annualMarginData}   // Helårsdata för marginal
        />
      </Box>

      <Box sx={{ height: "100%" }}>
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