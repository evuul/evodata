"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export default function PlayerCard({ playerCount, sx = {} }) {
  const [lastUpdated, setLastUpdated] = useState("");
  const [allTimeHigh, setAllTimeHigh] = useState(() => {
    // Hämta sparad ATH från localStorage, eller använd placeholder 124k om ingen finns
    const savedATH = localStorage.getItem("playerCountATH");
    return savedATH ? parseInt(savedATH, 10) : 119240; // Placeholder på 124k
  });
  const [athDate, setAthDate] = useState(() => {
    // Hämta sparat datum från localStorage, eller använd placeholder-datum om inget finns
    const savedDate = localStorage.getItem("playerCountATHDate");
    return savedDate || "5 april 2025"; // Placeholder-datum för 124k
  });

  // Uppdatera lastUpdated varje minut
  useEffect(() => {
    const fetchTime = () => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastUpdated(formattedTime);
    };

    fetchTime();
    const interval = setInterval(fetchTime, 300000); // Uppdatera varje minut

    return () => clearInterval(interval);
  }, []);

  // Kontrollera och uppdatera ATH samt datum baserat på playerCount
  useEffect(() => {
    if (playerCount && playerCount > allTimeHigh) {
      // Nytt rekord! Uppdatera ATH och spara i localStorage
      setAllTimeHigh(playerCount);
      localStorage.setItem("playerCountATH", playerCount.toString());

      // Spara datum och tid för det nya rekordet
      const now = new Date();
      const formattedDate = now.toLocaleString("sv-SE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setAthDate(formattedDate);
      localStorage.setItem("playerCountATHDate", formattedDate);
    }
  }, [playerCount, allTimeHigh]);

  const isHighPlayerCount = playerCount > 90000;
  const isVeryHighPlayerCount = playerCount > 100000;
  const isNewATH = playerCount === allTimeHigh; // Kontrollera om vi precis satt ett nytt rekord

  return (
    <Card
      sx={{
        width: { xs: "90%", sm: "80%", md: "70%" }, // Samma bredd som GraphBox och Header
        margin: "20px auto",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)", // Samma gradient som GraphBox
        borderRadius: "20px", // Samma rundade hörn som GraphBox
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)", // Samma skugga som GraphBox
        border: "1px solid rgba(255, 255, 255, 0.1)", // Samma subtila kantlinje som Header
        padding: "20px",
        textAlign: "center",
        color: "#ffffff",
        ...sx,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h4" // Ökat till h4 för mer tyngd
            sx={{
              fontWeight: "bold",
              color: "#fff", // Matchar den gröna färgen från GraphBox
              fontSize: {
                xs: "1.5rem", // För mobil
                sm: "2rem",   // För tablet
                md: "2.5rem", // För desktop
              },
            }}
          >
            Antal spelare:
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography
            variant="h2"
            fontWeight="bold"
            sx={{
              fontSize: {
                xs: "2rem",  // För mobil
                sm: "3rem",  // För tablet
                md: "4rem",  // För desktop
              },
              color: "#00e676", // Solid grön färg för att matcha GraphBox
            }}
          >
            {playerCount.toLocaleString()}
            {isHighPlayerCount && (
              <span
                style={{
                  color: "#FFCA28", // Gul färg för att matcha andra gula element i GraphBox
                  fontSize: "48px",
                  marginLeft: "10px",
                }}
              >
                🚀
              </span>
            )}
            {isVeryHighPlayerCount && (
              <span
                style={{
                  color: "#FFD700", // Guld för att fira milstolpen
                  fontSize: "48px",
                  marginLeft: "10px",
                }}
              >
                🏆
              </span>
            )}
            {isNewATH && (
              <span
                style={{
                  color: "#FFD700", // Guld för att markera nytt rekord
                  fontSize: "48px",
                  marginLeft: "10px",
                }}
              >
                🎉
              </span>
            )}
          </Typography>

          {/* All-Time High */}
          <Typography
            variant="h6" // Större text
            sx={{
              marginTop: "10px",
              color: "#FFCA28", // Gul färg för att sticka ut
              fontWeight: "bold",
              letterSpacing: "1px",
              fontSize: {
                xs: "1.1rem", // För mobil
                sm: "1.3rem", // För tablet
                md: "1.5rem", // För desktop
              },
              borderBottom: "2px solid #FFD700", // Guldstreck under texten
              paddingBottom: "4px", // Lite utrymme mellan text och streck
              display: "inline-block", // För att strecket bara ska vara under texten
              // textShadow: "0 0 8px rgba(255, 202, 40, 0.5)", // Gul skugga för "glöd"
            }}
          >
            All-Time High: {allTimeHigh.toLocaleString()}{" "}
            <span
              style={{
                color: "#FFD700", // Guld för ikonen
                fontSize: "24px", // Större ikon
                marginLeft: "5px",
              }}
            >
              🌟
            </span>
          </Typography>

          {/* Datum för ATH */}
          <Typography
            variant="body2"
            sx={{
              marginTop: "5px",
              color: "#ccc",
              opacity: 0.8,
              letterSpacing: "0.5px",
            }}
          >
            Satt: {athDate}
          </Typography>

          {/* Senast uppdaterad */}
          <Typography
            variant="body2"
            sx={{
              marginTop: "15px", // Mer utrymme för luft
              color: "#ccc", // Samma grå färg som i GraphBox
              opacity: 0.8, // Matchar GraphBox
              letterSpacing: "0.5px", // För bättre läsbarhet
            }}
          >
            Senast uppdaterad: {lastUpdated}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}