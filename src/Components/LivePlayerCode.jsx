import Image from "next/image";
import styles from "./page.module.css";

export default async function Home() {
  const respond = await fetch(
    "https://generous-shelagh-khalid-organization-eb1285b3.koyeb.app/api/players/current",
    {
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBbGV4YW5kZXIuZWtAbGl2ZS5zZSIsImlhdCI6MTc0MzE2NzkxMCwiZXhwIjoxNzQzNzcyNzEwfQ.P6NgU37IKNBXO_EMjpBOCTqgasPMwjmx2qeEYCIZL3c",
      },
    }
  );

  if (!respond.ok) {
    return <p>Kunde inte hämta datan</p>;
  }

  const data = await respond.json();

  return <div>{data.playersCount}</div>;
}
