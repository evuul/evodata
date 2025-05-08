"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

const MoneyCounter = ({ sx = {} }) => {
  const [amount, setAmount] = useState(0); // Räknare för vinsten sedan sidan öppnades
  const [totalProfitYTD, setTotalProfitYTD] = useState(0); // Total vinst YTD

  const dailyProfit = 36374400; // Daglig vinst i SEK

  // Beräkna antalet dagar sedan 1 januari 2025 och dagens datum
  const calculateDaysSinceStartOfYear = () => {
    const startOfYear = new Date("2025-01-01");
    const today = new Date();
    const diffInTime = today - startOfYear;
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24)) + 1; // +1 för att inkludera idag
    return { days: diffInDays, today };
  };

  // Formatera dagens datum till "DD MMM YYYY" (t.ex. "9 apr 2025")
  const formatDate = (date) => {
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Initial beräkning av YTD-vinst och daglig uppdatering
  useEffect(() => {
    // Beräkna initial YTD-vinst
    const { days } = calculateDaysSinceStartOfYear();
    const initialProfitYTD = dailyProfit * days;
    setTotalProfitYTD(initialProfitYTD);

    // Kontrollera om det är en ny dag och uppdatera YTD-vinst
    const checkForNewDay = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(0, 0, 0, 0); // Sätt till midnatt
      tomorrow.setDate(tomorrow.getDate() + 1); // Nästa dag

      const timeUntilTomorrow = tomorrow - now; // Tid till nästa dag i ms

      // När en ny dag börjar, lägg till en dags vinst
      const timeout = setTimeout(() => {
        setTotalProfitYTD((prev) => prev + dailyProfit);
        // Sätt upp en ny timer för nästa dag
        setInterval(() => {
          setTotalProfitYTD((prev) => prev + dailyProfit);
        }, 24 * 60 * 60 * 1000); // Uppdatera varje dag (24h)
      }, timeUntilTomorrow);

      return () => clearTimeout(timeout);
    };

    checkForNewDay();
  }, []);

  // Enkel animering för att räkna upp pengar sedan sidan öppnades
  useEffect(() => {
    const targetAmount = 36374400; // Totalt mål att uppnå (daglig vinst)
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

  // Formatera totalProfitYTD till miljarder SEK
  const formatTotalProfit = (value) => {
    if (!value) return 'N/A';
    const billions = value / 1_000_000_000; // Konvertera till miljarder
    return `${billions.toLocaleString('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B SEK`;
  };

  // Hämta dagens datum för visning
  const { today } = calculateDaysSinceStartOfYear();
  const formattedToday = formatDate(today);

  return (
    <Card
      sx={{
        width: { xs: "90%", sm: "80%", md: "70%" },
        margin: "20px auto",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "20px",
        textAlign: "center",
        color: "#ffffff",
        ...sx,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#fff",
              fontSize: {
                xs: "1.5rem",
                sm: "2rem",
                md: "2.5rem",
              },
            }}
          >
            Money Counter{" "}
            <span style={{ color: "#FFCA28" }}>💰</span>
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography
            variant="body1"
            sx={{
              color: "#ccc",
              opacity: 0.8,
              marginBottom: "10px",
              letterSpacing: "0.5px",
            }}
          >
            Ren vinst sedan du öppnade sidan:
          </Typography>

          {/* Pengasiffra utan pulserande effekt */}
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{
              fontSize: {
                xs: "2rem",
                sm: "3rem",
                md: "4rem",
              },
              color: "#00e676",
            }}
          >
            {amount.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK
          </Typography>

          {/* Uppskattad total vinst YTD med tydlig period */}
          <Box display="flex" flexDirection="column" alignItems="center" marginTop="15px">
            <Typography
              variant="body1"
              sx={{
                color: "#ccc",
                opacity: 0.8,
                marginBottom: "5px",
                letterSpacing: "0.5px",
              }}
            >
              Uppskattad ren vinst (1 jan 2025 - {formattedToday}):
            </Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                fontSize: {
                  xs: "1.2rem",
                  sm: "1.5rem",
                  md: "2rem",
                },
                color: "#FFCA28",
              }}
            >
              {formatTotalProfit(totalProfitYTD)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MoneyCounter;