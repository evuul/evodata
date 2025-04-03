"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Chip, Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

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

  const pulseAnimation = {
    scale: [1, 1.1, 1],
    opacity: [1, 0.85, 1],
    transition: { duration: 1, repeat: Infinity, repeatType: "loop" },
  };

  return (
    <Card
      sx={{
        maxWidth: {
          xs: "100%",   // För mobil, full bredd
          sm: 380,      // För tablet och större, max 380px
          md: 450       //för större skärmar
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
          <motion.div animate={pulseAnimation}>
            <Chip
              label="LIVE"
              color="error"
              size="small"
              sx={{
                fontWeight: "bold",
                background: "linear-gradient(45deg, #ff5e62, #ff9966)",
                color: "#fff",
                padding: "5px 10px",
                borderRadius: "8px",
              }}
            />
          </motion.div>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography variant="h6" sx={{ opacity: 0.9, marginBottom: "5px" }}>
            Antal spelare:
          </Typography>

          <motion.div key={playerCount} animate={pulseAnimation}>
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
                textShadow: "0 0 5px rgba(175, 238, 238, 0.4)",
              }}
            >
              {playerCount.toLocaleString()}
              {isHighPlayerCount && (
                <motion.span
                  animate={{
                    y: [0, -10, 0],
                    x: [0, -4, 4, 0],
                    rotate: [0, -2, 2, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                  style={{
                    color: "#ffcc00",
                    fontSize: "48px",
                    textShadow: "0 0 5px rgba(255, 204, 0, 0.4)",
                  }}
                >
                  🚀
                </motion.span>
              )}
            </Typography>
          </motion.div>

          {/* Senast uppdaterad */}
          <Typography variant="body2" sx={{ marginTop: "10px", opacity: 0.7 }}>
            Senast uppdaterad: {lastUpdated}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}