"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export default function PlayerCard({ playerCount }) {
  const [lastUpdated, setLastUpdated] = useState("");

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
    const interval = setInterval(fetchTime, 60000); // Uppdatera varje minut

    return () => clearInterval(interval);
  }, []);

  const isHighPlayerCount = playerCount > 90000;
  const isVeryHighPlayerCount = playerCount > 100000;

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
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h4" // Ökat till h4 för mer tyngd
            sx={{
              fontWeight: "bold",
              color: "#00e676", // Matchar den gröna färgen från GraphBox
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