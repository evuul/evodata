'use client';
import React, { useState, useEffect } from "react";
import { Typography, Box, Chip, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useStockPriceContext } from '../context/StockPriceContext';
import StockPrice from './StockPrice'; // Importera StockPrice-komponenten

const Header = () => {
  const { stockPrice, loading: loadingPrice, error: priceError, marketCap, lastUpdated, refresh } = useStockPriceContext();

  // Lokal helper för format
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  const fmtCap = (v) => {
    if (!v) return 'N/A';
    const b = v / 1_000_000_000;
    return `${b.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B SEK`;
  };
  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun,1=Mon,...
    if (day === 0 || day === 6) return false;
    const h = now.getHours();
    const m = now.getMinutes();
    const afterOpen = h > 9 || (h === 9 && m >= 0);
    const beforeClose = h < 17 || (h === 17 && m <= 30);
    return afterOpen && beforeClose;
  };

  // Hämta pris och procent för mobilvisning
  const currentPrice = stockPrice?.price?.regularMarketPrice?.raw || "N/A";
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw || 0;
  const changeColor = changePercent > 0 ? "#00e676" : changePercent < 0 ? "#ff1744" : "#ccc";

  return (
    <Box
      sx={{
        textAlign: "center",
        padding: { xs: "12px", sm: "16px" },
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: { xs: "92%", sm: "85%", md: "75%" },
        margin: "16px auto",
        transition: "all 0.3s ease",
        // Not sticky: allow normal scroll behavior
      }}
    >
      {/* Top bar: source + updated + refresh */}
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Chip label="EVO.ST • Nasdaq Stockholm" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={isMarketOpen() ? 'Börs: Öppen' : 'Börs: Stängd'}
            size="small"
            sx={{ backgroundColor: isMarketOpen() ? '#1b402a' : '#402a2a', color: isMarketOpen() ? '#00e676' : '#ff6f6f' }}
          />
          {lastUpdated && (
            <Chip label={`Uppdaterad ${fmtTime(lastUpdated)}`} size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
          )}
          <Tooltip title="Uppdatera">
            <IconButton onClick={refresh} sx={{ color: '#00e676', display: { xs: 'none', sm: 'inline-flex' } }} aria-label="Uppdatera aktiedata">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 700,
          fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
          color: "#ffffff",
          marginBottom: { xs: "8px", sm: "12px" },
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Evolution Tracker
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: "#b0b0b0",
          fontSize: { xs: "0.9rem", sm: "1rem" },
          opacity: 0.9,
          marginBottom: { xs: "8px", sm: "12px" },
          display: { xs: "none", sm: "block" },
          fontWeight: 500,
        }}
      >
        Spåra utvecklingen och statistik för 2025
      </Typography>

      {/* Aktiepris och relaterad data */}
      {loadingPrice ? (
        <Typography
          variant="body2"
          sx={{
            color: "#b0b0b0",
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
            fontWeight: 500,
          }}
        >
          Laddar aktiepris...
        </Typography>
      ) : priceError ? (
        <Typography
          variant="body2"
          sx={{
            color: "#ff1744",
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
            fontWeight: 500,
          }}
        >
          Kunde inte hämta aktiepris
        </Typography>
      ) : (
        <>
          {/* Kompakt layout för mobil (bara pris och procent) */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                fontSize: "1.1rem",
                fontWeight: 600,
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
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 500,
              }}
            >
              {changePercent !== 0
                ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`
                : "0.00%"}
              {changePercent > 0 && <span style={{ fontSize: "0.9rem" }}>↑</span>}
              {changePercent < 0 && <span style={{ fontSize: "0.9rem" }}>↓</span>}
            </Typography>
          </Box>

          {/* Full StockPrice-komponent på större skärmar */}
          <Box
            sx={{
              display: { xs: "none", sm: "block" },
              marginBottom: "0px",
            }}
          >
            <StockPrice />
          </Box>
          {/* Extra metrics under pris */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
            <Chip label={`Market Cap: ${fmtCap(marketCap)}`} size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
          </Box>
        </>
      )}
    </Box>
  );
};

export default Header;
