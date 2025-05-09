"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export default function PlayerCard({ playerCount, sx = {} }) {
  const [lastUpdated, setLastUpdated] = useState("");
  const [allTimeHigh, setAllTimeHigh] = useState(() => {
    const savedATH = localStorage.getItem("playerCountATH");
    return savedATH ? parseInt(savedATH, 10) : 124707;
  });
  const [athDate, setAthDate] = useState(() => {
    const savedDate = localStorage.getItem("playerCountATHDate");
    return savedDate || "8 maj 2025";
  });

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
    const interval = setInterval(fetchTime, 300000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (playerCount && playerCount > allTimeHigh) {
      setAllTimeHigh(playerCount);
      localStorage.setItem("playerCountATH", playerCount.toString());

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

  const isHighPlayerCount = playerCount > 85000;
  const isVeryHighPlayerCount = playerCount > 100000;
  const isNewATH = playerCount === allTimeHigh;

  return (
    <Card
      sx={{
        width: { xs: "92%", sm: "85%", md: "75%" },
        margin: "16px auto",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: { xs: "12px", sm: "16px" },
        textAlign: "center",
        color: "#ffffff",
        ...sx,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#ffffff",
              fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
              letterSpacing: "0.5px",
            }}
          >
            Antal spelare
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="12px">
          <Typography
            variant="h2"
            fontWeight="700"
            sx={{
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
              color: "#00e676",
              marginBottom: "8px",
            }}
          >
            {playerCount.toLocaleString()}
            {isHighPlayerCount && (
              <span style={{ color: "#FFCA28", fontSize: "32px", marginLeft: "8px" }}>🚀</span>
            )}
            {isVeryHighPlayerCount && (
              <span style={{ color: "#FFD700", fontSize: "32px", marginLeft: "8px" }}>🏆</span>
            )}
            {isNewATH && (
              <span style={{ color: "#FFD700", fontSize: "32px", marginLeft: "8px" }}>🎉</span>
            )}
          </Typography>

          <Typography
            variant="h6"
            sx={{
              marginTop: "8px",
              color: "#AB47BC",
              fontWeight: 600,
              letterSpacing: "0.5px",
              fontSize: { xs: "1rem", sm: "1.2rem", md: "1.4rem" },
              borderBottom: "1px solid #AB47BC",
              paddingBottom: "2px",
              display: "inline-block",
            }}
          >
            All-Time High: {allTimeHigh.toLocaleString()}
            {/* <span style={{ color: "#FFD700", fontSize: "20px", marginLeft: "4px" }}>🌟</span> */}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              marginTop: "4px",
              color: "#b0b0b0",
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              opacity: 0.9,
            }}
          >
            Satt: {athDate}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              marginTop: "10px",
              color: "#b0b0b0",
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              opacity: 0.9,
            }}
          >
            Senast uppdaterad: {lastUpdated}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}