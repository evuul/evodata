'use client';
import React, { useState, useEffect } from "react";
import { Typography, Box } from "@mui/material";
import { useStockPriceContext } from '../context/StockPriceContext';
import StockPrice from './StockPrice'; // Importera StockPrice-komponenten

const Header = () => {
  const { stockPrice, loading: loadingPrice, error: priceError } = useStockPriceContext();
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (stockPrice && !loadingPrice) {
      setLastUpdated(new Date());
    }
  }, [stockPrice, loadingPrice]);

  // Hämta pris och procent för mobilvisning
  const currentPrice = stockPrice?.price?.regularMarketPrice?.raw || "N/A";
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw || 0;
  const changeColor = changePercent > 0 ? "#00e676" : changePercent < 0 ? "#ff1744" : "#ccc";

  return (
    <Box
      sx={{
        textAlign: "center",
        marginTop: "20px",
        padding: { xs: "10px", sm: "20px" },
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: { xs: "90%", sm: "80%", md: "70%" },
        margin: "20px auto",
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: "bold",
          fontSize: {
            xs: "2rem",
            sm: "3rem",
            md: "4rem",
          },
          color: "#fff",
          marginBottom: { xs: "5px", sm: "10px" },
        }}
      >
        Evolution Tracker!
      </Typography>

      {/* Underrubrik (dold på mobil) */}
      {/* <Typography
        variant="body1"
        sx={{
          color: "#ccc",
          fontSize: { xs: "1rem", sm: "1.2rem" },
          opacity: 0.8,
          letterSpacing: "1px",
          marginBottom: { xs: "5px", sm: "10px" },
          display: { xs: "none", sm: "block" },
        }}
      >
        Här håller vi koll på utvecklingen och statistik för 2025!
      </Typography> */}

      {/* Aktiepris och relaterad data */}
      {loadingPrice ? (
        <Typography
          variant="body2"
          sx={{
            color: "#ccc",
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          Laddar aktiepris...
        </Typography>
      ) : priceError ? (
        <Typography
          variant="body2"
          sx={{
            color: "#ff1744",
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          Kunde inte hämta aktiepris
        </Typography>
      ) : (
        <>
          {/* Kompakt layout för mobil (bara pris och procent) */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" }, // Visa bara på xs
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              marginBottom: "5px",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
            >
              {currentPrice !== "N/A"
                ? `${currentPrice.toLocaleString("sv-SE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} SEK`
                : "N/A"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: changeColor,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {changePercent !== 0
                ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`
                : "0.00%"}
              {changePercent > 0 && <span>↑</span>}
              {changePercent < 0 && <span>↓</span>}
            </Typography>
          </Box>

          {/* Full StockPrice-komponent på större skärmar */}
          <Box
            sx={{
              display: { xs: "none", sm: "block" }, // Visa bara på sm och uppåt
              marginBottom: "0px",
            }}
          >
            <StockPrice />
          </Box>
        </>
      )}

      {/* Senast uppdaterad tid */}
      {/* {lastUpdated && !loadingPrice && !priceError && (
        <Typography
          variant="body2"
          sx={{
            color: "#ccc",
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            opacity: 0.7,
          }}
        >
          Senast uppdaterad: {lastUpdated.toLocaleTimeString("sv-SE")}
        </Typography>
      )} */}
    </Box>
  );
};

export default Header;