"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

const MoneyCounter = () => {
  const exchangeRate = 10.83; // EUR till SEK
  const quarterlyProfitEUR = 377100000; // Evolution Q4 2023 vinst i EUR
  const quarterlyProfitSEK = quarterlyProfitEUR * exchangeRate; // Omvandlat till SEK

  // Beräkningar
  const profitPerDay = quarterlyProfitSEK / 92; // 92 dagar i kvartalet
  const profitPerSecond = profitPerDay / 24 / 60 / 60; // Omvandlat till SEK per sekund

  const [money, setMoney] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMoney((prevMoney) => prevMoney + profitPerSecond);
    }, 1000);

    return () => clearInterval(interval); // Clean up the interval when component unmounts
  }, [profitPerSecond]);

  return (
    <Card
      sx={{
        maxWidth: {
          xs: "100%",   // 100% bredd för mobil
          sm: 380,      // 380px bredd för tablet och större
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
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#ff9966" }}>
            Evolution Money Counter 💰
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="20px">
          <Typography variant="h6" sx={{ opacity: 0.9, marginBottom: "5px" }}>
            Ren vinst sedan du öppnade sidan:
          </Typography>

          {/* Pengasiffra utan animation */}
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
              textShadow: "0 0 5px rgba(175, 238, 238, 0.4)",
            }}
          >
            {money.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MoneyCounter;