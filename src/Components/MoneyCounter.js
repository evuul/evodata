"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

const MoneyCounter = ({ sx = {} }) => {
  const [amountPerSecond, setAmountPerSecond] = useState(0); // Vinst sedan sidan laddades
  const [totalProfitYTD, setTotalProfitYTD] = useState(0); // Total vinst YTD
  const [todayProfit, setTodayProfit] = useState(0); // Dagens vinst sedan midnatt

  const dailyProfit = 36374400; // Daglig vinst i SEK
  const profitPerSecond = dailyProfit / (24 * 60 * 60); // Vinst per sekund

  // Beräkna antalet sekunder sedan midnatt
  const calculateSecondsSinceMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const seconds = Math.floor((now - midnight) / 1000);
    return seconds;
  };

  // Beräkna antalet dagar sedan 1 januari 2025 och dagens datum
  const calculateDaysSinceStartOfYear = () => {
    const startOfYear = new Date("2025-01-01");
    const today = new Date();
    const diffInTime = today - startOfYear;
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24)) + 1;
    return { days: diffInDays, today };
  };

  // Formatera dagens datum till "DD MMM YYYY"
  const formatDate = (date) => {
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Initial beräkning av YTD-vinst och daglig uppdatering
  useEffect(() => {
    const { days } = calculateDaysSinceStartOfYear();
    const initialProfitYTD = dailyProfit * days;
    setTotalProfitYTD(initialProfitYTD);

    // Beräkna dagens vinst sedan midnatt
    const secondsSinceMidnight = calculateSecondsSinceMidnight();
    const initialTodayProfit = profitPerSecond * secondsSinceMidnight;
    setTodayProfit(initialTodayProfit);

    const checkForNewDay = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeUntilTomorrow = tomorrow - now;

      const timeout = setTimeout(() => {
        setTotalProfitYTD((prev) => prev + dailyProfit);
        setAmountPerSecond(0);
        setTodayProfit(0); // Återställ dagens vinst vid midnatt
        setInterval(() => {
          setTotalProfitYTD((prev) => prev + dailyProfit);
          setAmountPerSecond(0);
          setTodayProfit(0);
        }, 24 * 60 * 60 * 1000);
      }, timeUntilTomorrow);

      return () => clearTimeout(timeout);
    };

    checkForNewDay();
  }, []);

  // Uppdatera vinst per sekund och dagens vinst i realtid
  useEffect(() => {
    const interval = setInterval(() => {
      setAmountPerSecond((prev) => {
        const newAmount = prev + profitPerSecond;
        if (newAmount >= dailyProfit) {
          return 0;
        }
        return newAmount;
      });
      setTodayProfit((prev) => {
        const newProfit = prev + profitPerSecond;
        if (newProfit >= dailyProfit) {
          return dailyProfit;
        }
        return newProfit;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Formatera totalProfitYTD till miljarder SEK
  const formatTotalProfit = (value) => {
    if (!value) return "N/A";
    const billions = value / 1_000_000_000;
    return `${billions.toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B SEK`;
  };

  // Formatera vinst per sekund
  const formatProfitPerSecond = (value) => {
    return `${Math.floor(value).toLocaleString("sv-SE")} SEK`;
  };

  // Formatera dagens vinst
  const formatDailyProfit = (value) => {
    return `${Math.floor(value).toLocaleString("sv-SE")} SEK`;
  };

  const { today } = calculateDaysSinceStartOfYear();
  const formattedToday = formatDate(today);

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
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
            Vinstindikator
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="12px">
          <Typography
            variant="body1"
            sx={{
              color: "#b0b0b0",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              opacity: 0.9,
              marginBottom: "8px",
            }}
          >
            Vinst i realtid (per sekund):
          </Typography>

          <Typography
            variant="h3"
            fontWeight="700"
            sx={{
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
              color: "#00e676",
              marginBottom: "12px",
            }}
          >
            {formatProfitPerSecond(amountPerSecond)}
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" marginTop="12px">
            <Typography
              variant="body1"
              sx={{
                color: "#b0b0b0",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                opacity: 0.9,
                marginBottom: "4px",
              }}
            >
              Total vinst (1 jan 2025 - {formattedToday}):
            </Typography>
            <Typography
              variant="h5"
              fontWeight="600"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
                color: "#FFCA28",
                marginBottom: "4px",
              }}
            >
              {formatTotalProfit(totalProfitYTD)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#00e676", // Samma gröna färg som vinst per sekund
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              Dagens vinst (fram till nu): {formatDailyProfit(todayProfit)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MoneyCounter;