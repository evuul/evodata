"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

const MoneyCounter = ({ sx = {}, dailyProfitPerDay = 36374400 }) => {
  const [totalProfitYTD, setTotalProfitYTD] = useState(0); // Total vinst YTD (till nu)
  const [todayProfit, setTodayProfit] = useState(0); // Dagens vinst (till nu)

  // Start på innevarande år
  const getStartOfYear = () => {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  };

  // Beräkna realtidsvärden exakt utifrån klockan (undviker drift och extra timers)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const startOfYear = getStartOfYear();

      // Dagar sedan årets start (hela passerade dagar)
      const msPerDay = 24 * 60 * 60 * 1000;
      const wholeDaysSinceYearStart = Math.floor((now - startOfYear) / msPerDay);

      // Dagens andel
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const secondsSinceMidnight = (now - startOfToday) / 1000;
      const fractionOfDay = secondsSinceMidnight / (24 * 60 * 60);

      const todayProfitValue = dailyProfitPerDay * Math.max(0, Math.min(1, fractionOfDay));
      const totalProfitToNow = dailyProfitPerDay * wholeDaysSinceYearStart + todayProfitValue;

      setTodayProfit(todayProfitValue);
      setTotalProfitYTD(totalProfitToNow);
    };

    // Kör direkt och sedan varje sekund
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dailyProfitPerDay]);

  // Formatera dagens datum till "DD MMM YYYY"
  const formatDate = (date) => {
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Formatera totalProfitYTD till miljarder SEK
  const formatTotalProfit = (value) => {
    if (!value) return "N/A";
    const billions = value / 1_000_000_000;
    return `${billions.toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B SEK`;
  };

  // Formatera dagens vinst
  const formatDailyProfit = (value) => {
    return `${Math.floor(value).toLocaleString("sv-SE")} SEK`;
  };

  const startOfYear = getStartOfYear();
  const formattedStart = formatDate(startOfYear);
  const formattedToday = formatDate(new Date());

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
            Dagens vinst (fram till nu):
          </Typography>

          <Typography
            variant="h3"
            fontWeight="700"
            sx={{
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
              color: "#00e676",
              marginBottom: "0px",
              fontFeatureSettings: '"tnum"',
            }}
            aria-live="polite"
          >
            {formatDailyProfit(todayProfit)}
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
              Total vinst ({formattedStart} - {formattedToday}):
            </Typography>
            <Typography
              variant="h5"
              fontWeight="600"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
                color: "#fff",
                marginBottom: "4px",
                fontFeatureSettings: '"tnum"',
              }}
              aria-live="polite"
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
