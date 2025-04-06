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

  return (
    <Card
      sx={{
        maxWidth: {
          xs: "100%",   // För mobil, full bredd
          sm: 380,      // För tablet och större, max 380px
          md: 450       // För större skärmar
        },
        margin: "20px auto",
        background: "linear-gradient(145deg, rgb(10, 25, 47), rgb(20, 50, 70))",
        borderRadius: "24px",
        boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)",
        padding: "20px",
        textAlign: "center",
        color: "#ffffff",
        border: "3px solid rgb(30, 100, 130)",
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#ff9966" }}>
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
              background: "linear-gradient(45deg, rgb(175, 238, 238), rgb(240, 255, 255))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 5px rgba(0, 230, 118, 0.6)", // Grön textskugga (#00e676)
              color: "#00e676",  // Grön färg för texten
            }}
          >
            {playerCount.toLocaleString()}
            {isHighPlayerCount && (
              <span
                style={{
                  color: "#ffcc00",  // Guld färg för ikonen
                  fontSize: "48px",
                  textShadow: "0 0 5px rgba(255, 204, 0, 0.4)", // Guld textskugga
                }}
              >
                🚀
              </span>
            )}
          </Typography>

          {/* Senast uppdaterad */}
          <Typography variant="body2" sx={{ marginTop: "10px", opacity: 0.7 }}>
            Senast uppdaterad: {lastUpdated}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}