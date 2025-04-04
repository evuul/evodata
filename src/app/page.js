import { Analytics } from "@vercel/analytics/react";
import PlayerCard from "../Components/PlayerCard";
import MoneyCounter from "../Components/MoneyCounter";
import Header from "../Components/Header";
import ComingUpdates from "../Components/ComingUpdates";
import StockBuybackInfo from "../Components/StockBuybackInfo"; // Importera StockBuybackInfo
import { Grid, Box } from "@mui/material"; // Importera Grid och Box från MUI

export default async function Home() {
  // Hämta data från API
  const response = await fetch(
    "https://generous-shelagh-khalid-organization-eb1285b3.koyeb.app/api/players/current",
    {
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBbGV4YW5kZXIuZWtAbGl2ZS5zZSIsImlhdCI6MTc0MzE2NzkxMCwiZXhwIjoxNzQzNzcyNzEwfQ.P6NgU37IKNBXO_EMjpBOCTqgasPMwjmx2qeEYCIZL3c",
      },
    }
  );

  // Hantera fel om API-anropet misslyckas
  if (!response.ok) {
    return <p>Kunde inte hämta datan</p>;
  }

  // Hämta JSON-data
  const data = await response.json();

  // Här definierar vi data för aktieåterköp
  const isBuybackActive = true; // Exempel på status för aktieåterköp
  const buybackCash = 500000000; // Exempel på kassa för aktieåterköp i SEK
  const sharesBought = 2100081; // Exempel på antal återköpta aktier
  const averagePrice = 809; // Exempel på genomsnittlig aktiekurs

  return (
    <main>
      <Header />

      {/* Box för PlayerCard */}
      <Box sx={{ height: "100%" }}>
        <PlayerCard playerCount={data.playersCount} />
      </Box>

      {/* Box för MoneyCounter */}
      <Box sx={{ height: "100%" }}>
        <MoneyCounter />
      </Box>

      {/* Box för StockBuybackInfo */}
      <Box sx={{ height: "100%" }}>
        <StockBuybackInfo
          isActive={isBuybackActive}
          buybackCash={buybackCash}
          sharesBought={sharesBought}
          averagePrice={averagePrice}  // Genomsnittlig aktiekurs
        />
      </Box>

      <ComingUpdates />
    </main>
  );
}