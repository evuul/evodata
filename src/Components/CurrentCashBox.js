'use client';
import React, { useState, useEffect } from "react";
import { Box, Typography, Card } from "@mui/material";

const CurrentCashBox = ({ financialReports }) => {
  const EXCHANGE_RATE = 11.02;
  const dailyProfit = 36374400;

  // Manuellt angivet återstående återköpsbelopp (i BSEK) för Q2 2025
  // Uppdatera detta värde baserat på hur mycket som är kvar av återköpskassan
  const remainingBuybackInSEK = 3.811; // Exempelvärde: 3.500 BSEK, ändra detta efter behov

  // State för att lagra beräknade värden
  const [dateInfo, setDateInfo] = useState({ days: null, today: null, latestQuarter: null, latestQuarterEndDate: null });

  // Funktion för att hitta det senaste kvartalet
  const getLatestQuarter = (reports) => {
    if (!reports?.financialReports?.length) return null;

    const sortedReports = [...reports.financialReports].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Sortera efter år (nyast först)
      return parseInt(b.quarter.replace("Q", "")) - parseInt(a.quarter.replace("Q", "")); // Sortera efter kvartal
    });

    return sortedReports[0]; // Returnera det senaste kvartalet
  };

  // Funktion för att få slutdatumet för ett kvartal
  const getQuarterEndDate = (year, quarter) => {
    switch (quarter) {
      case "Q1":
        return new Date(year, 2, 31); // 31 mars
      case "Q2":
        return new Date(year, 5, 30); // 30 juni
      case "Q3":
        return new Date(year, 8, 30); // 30 september
      case "Q4":
        return new Date(year, 11, 31); // 31 december
      default:
        return null;
    }
  };

  // Beräkna dagar mellan senaste kvartalet och idag
  useEffect(() => {
    const latestQuarter = getLatestQuarter(financialReports);
    if (!latestQuarter) {
      console.log("Inget senaste kvartal hittades");
      return;
    }

    const quarterEndDate = getQuarterEndDate(latestQuarter.year, latestQuarter.quarter);
    if (!quarterEndDate) {
      console.log("Kunde inte få kvartalets slutdatum");
      return;
    }

    const today = new Date();
    const diffInTime = today - quarterEndDate;
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24)) + 1;

    setDateInfo({
      days: diffInDays,
      today,
      latestQuarter: `${latestQuarter.quarter} ${latestQuarter.year}`,
      latestQuarterEndDate: quarterEndDate,
    });
  }, [financialReports]);

  const formatDate = (date) => {
    if (!date) return "Laddar...";
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const latestQuarterData = getLatestQuarter(financialReports);
  const latestCash = latestQuarterData?.cashEnd || 0;
  const latestCashBSEK = (latestCash * EXCHANGE_RATE) / 1000;

  const estimatedIncrease = dateInfo.days ? (dailyProfit * dateInfo.days) / 1000000000 : 0;
  const estimatedCashBSEKBeforeBuyback = latestCashBSEK + estimatedIncrease;
  const estimatedCashBSEKAfterBuyback = estimatedCashBSEKBeforeBuyback - remainingBuybackInSEK;

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

      {latestCash > 0 && dateInfo.latestQuarter ? (
        <Box>
          <Typography
            variant="h5"
            sx={{
              color: "#fff",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            {dateInfo.latestQuarter}: {latestCashBSEK.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#FF6F61",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Återstående återköpsprogram -{remainingBuybackInSEK.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#00c853",
              marginBottom: "10px",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Uppskattning {formatDate(dateInfo.today)} (efter återköp): {estimatedCashBSEKAfterBuyback.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
          </Typography>
          {dateInfo.days && (
            <Typography
              variant="body1"
              color="#ccc"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Uppskattad ökning sedan {dateInfo.latestQuarter}: {estimatedIncrease.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK
              <br />
              (baserat på {dateInfo.days} dagar med daglig vinst på {dailyProfit.toLocaleString("sv-SE")} SEK)
              <br />
              Kassan har justerats för återstående återköp på {remainingBuybackInSEK.toLocaleString("sv-SE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BSEK.
            </Typography>
          )}
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