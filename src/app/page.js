import PlayerCard from "../Components/PlayerCard";
import MoneyCounter from "../Components/MoneyCounter";
import Header from "../Components/Header";
import ComingUpdates from "../Components/ComingUpdates";


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
      <PlayerCard playerCount={data.playersCount} />
      <MoneyCounter />
      <ComingUpdates />
    </main>
  );
}