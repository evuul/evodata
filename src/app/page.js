import { Analytics } from "@vercel/analytics/react"
import PlayerCard from "../Components/PlayerCard";
import MoneyCounter from "../Components/MoneyCounter";
import Header from "../Components/Header";
import ComingUpdates from "../Components/ComingUpdates";
import { Grid, Box } from "@mui/material"; // Importera Grid och Box från MUI



export default async function Home() {
  const response = await fetch(
    "https://generous-shelagh-khalid-organization-eb1285b3.koyeb.app/api/players/current",
    {
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBbGV4YW5kZXIuZWtAbGl2ZS5zZSIsImlhdCI6MTc0MzE2NzkxMCwiZXhwIjoxNzQzNzcyNzEwfQ.P6NgU37IKNBXO_EMjpBOCTqgasPMwjmx2qeEYCIZL3c",
      },
    }
  );

  if (!response.ok) {
    return <p>Kunde inte hämta datan</p>;
  }

  const data = await response.json();

  return (
<main>
  <Header />

      <Box sx={{ height: "100%" }}>
        <PlayerCard playerCount={data.playersCount} />
      </Box>

      <Box sx={{ height: "100%" }}>
        <MoneyCounter />

</Box>

  <ComingUpdates />
</main>
  );
}