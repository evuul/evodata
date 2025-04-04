"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

const MoneyCounter = ({ sx = {} }) => {
  const [amount, setAmount] = useState(0);

  // Enkel animering för att räkna upp pengar
  useEffect(() => {
    const targetAmount = 36374400; // Totalt mål att uppnå
    const duration = 86400000; // Totalt antal sekunder på 24 timmar (24h * 60m * 60s)
    const stepTime = 20; // Hur ofta vi uppdaterar (i millisekunder)
    const steps = duration / stepTime; // Antal uppdateringar baserat på stepTime
    const increment = targetAmount / steps; // Hur mycket vi ökar varje gång
  
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetAmount) {
        current = targetAmount;
        clearInterval(interval); // Stanna när vi når målet
      }
      setAmount(Math.floor(current)); // Uppdatera amount på skärmen
    }, stepTime);
  
    return () => clearInterval(interval); // Rensa intervallet när komponenten tas bort
  }, []);

  return (
    <Card
      sx={{
        maxWidth: {
          xs: "100%",   // 100% bredd för mobil
          sm: 380,      // 380px bredd för tablet och större
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
        ...sx, // Spread för eventuella externa styles
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#ff9966" }}>
            Evolution Money Counter 💰
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography variant="h6" sx={{ opacity: 0.9, marginBottom: "5px" }}>
            Ren vinst sedan du öppnade sidan:
          </Typography>

          {/* Pengasiffra med animation */}
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{
              fontSize: {
                xs: "2rem",  // För mobil
                sm: "3rem",  // För tablet
                md: "4rem",  // För större skärmar (desktop)
              },
              background: "linear-gradient(45deg, rgb(175, 238, 238), rgb(240, 255, 255))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 5px rgba(0, 230, 118, 0.6)", // Grön textskugga (#00e676)
              color: "#00e676",  // Sätt textfärgen till den gröna färgen
            }}
          >
            {amount.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MoneyCounter;