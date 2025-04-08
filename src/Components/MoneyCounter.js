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
        width: { xs: "90%", sm: "80%", md: "70%" }, // Samma bredd som GraphBox, Header och PlayerCard
        margin: "20px auto",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)", // Samma gradient som GraphBox
        borderRadius: "20px", // Samma rundade hörn som GraphBox
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)", // Samma skugga som GraphBox
        border: "1px solid rgba(255, 255, 255, 0.1)", // Samma subtila kantlinje som Header och PlayerCard
        padding: "20px",
        textAlign: "center",
        color: "#ffffff",
        ...sx, // Spread för eventuella externa styles
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h4" // Ökat till h4 för mer tyngd, som i PlayerCard
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
            Money Counter{" "}
            <span style={{ color: "#FFCA28" }}>💰</span> {/* Gul färg för emojin */}
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography
            variant="body1" // Ändrat till body1 för att matcha PlayerCard
            sx={{
              color: "#ccc", // Samma grå färg som i GraphBox och PlayerCard
              opacity: 0.8, // Matchar GraphBox och PlayerCard
              marginBottom: "10px", // Mer utrymme för luft
              letterSpacing: "0.5px", // För bättre läsbarhet
            }}
          >
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
              color: "#00e676", // Solid grön färg för att matcha GraphBox
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