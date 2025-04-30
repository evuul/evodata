'use client';
import React from "react";
import { Box, Typography, Card } from "@mui/material";

const CurrentCashBox = ({ financialReports }) => {
  // Växelkurs SEK/EUR (från StockBuybackInfo)
  const EXCHANGE_RATE = 11.02;

  // Daglig vinst i SEK (från din kod)
  const dailyProfit = 36374400; // SEK

  // Kassa avsedd för aktieåterköp (från StockBuybackInfo, i EUR)
  const buybackCash = 500000000; // 500 MEUR
  const buybackCashInSEK = (buybackCash * EXCHANGE_RATE) / 1000000000; // Konvertera till BSEK

  // Beräkna antalet dagar sedan 31 december 2024 (slutet på Q4 2024) till idag
  const calculateDaysSinceQ4 = () => {
    const endOfQ4 = new Date("2025-03-30");
    const today = new Date("2025-04-30"); // Dagens datum (25 april 2025)
    const diffInTime = today - endOfQ4;
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24)) + 1; // +1 för att inkludera idag
    return { days: diffInDays, today };
  };

  // Formatera datum till "DD MMM YYYY" (t.ex. "25 apr 2025")
  const formatDate = (date) => {
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Hämta den senaste kassan (Q4 2024, cashEnd)
  const latestCash = financialReports?.financialReports
    ?.filter(item => item.year === 2025 && item.quarter === "Q1")[0]?.cashEnd || 0;

  // Konvertera kassan från MEUR till BSEK
  const latestCashBSEK = (latestCash * EXCHANGE_RATE) / 1000; // MEUR till BSEK (miljoner till miljarder)

  // Beräkna uppskattad ökning sedan Q4 2024
  const { days, today } = calculateDaysSinceQ4();
  const estimatedIncrease = (dailyProfit * days) / 1000000000; // SEK till BSEK (miljoner till miljarder)
  const estimatedCashBSEKBeforeBuyback = latestCashBSEK + estimatedIncrease;

  // Subtrahera kassan avsedd för aktieåterköp
  const estimatedCashBSEKAfterBuyback = estimatedCashBSEKBeforeBuyback - buybackCashInSEK;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: { xs: "15px", sm: "25px" },
        margin: "20px auto",
        width: { xs: "95%", sm: "80%", md: "70%" },
        textAlign: "center",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#00e676",
          marginBottom: "20px",
          fontSize: { xs: "1.5rem", sm: "2rem" },
        }}
      >
        Nuvarande kassa (BSEK)
      </Typography>

      {latestCash > 0 ? (
        <Box>
          <Typography
            variant="h5"
            sx={{
              color: "#fff",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Q1 2025: {latestCashBSEK.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#FF6F61",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Återköpsprogram -5,51 BSEK
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#00c853",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Uppskattning {formatDate(today)} (efter återköp): {estimatedCashBSEKAfterBuyback.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
          </Typography>
          <Typography
            variant="body1"
            color="#ccc"
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Uppskattad ökning sedan Q1 2025: {estimatedIncrease.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
            <br />
            (baserat på {days} dagar med daglig vinst på {dailyProfit.toLocaleString("sv-SE")} SEK)
            <br />
            Kassan har justerats för aktieåterköp på {buybackCashInSEK.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK.
          </Typography>
        </Box>
      ) : (
        <Typography
          variant="body1"
          color="#ccc"
          sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
        >
          Ingen kassadata tillgänglig.
        </Typography>
      )}
    </Card>
  );
};

export default CurrentCashBox;