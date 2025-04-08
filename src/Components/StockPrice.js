'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, keyframes } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'; // Ikon för uppåtgående trend
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'; // Ikon för nedåtgående trend

// Animation för en subtil puls-effekt
const pulse = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 230, 118, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 230, 118, 0.6); }
  100% { box-shadow: 0 0 5px rgba(0, 230, 118, 0.3); }
`;

const StockPrice = () => {
  const [stockPrice, setStockPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStockPrice = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stock?symbol=EVO.ST');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setStockPrice(data);
        setError(null);
      } catch (err) {
        setError('Kunde inte hämta aktiepriset.');
        console.error('Error fetching stock price:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockPrice();
  }, []);

  // Hämta pris och procentuell förändring
  const price = stockPrice?.price?.regularMarketPrice?.raw;
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw; // Procentuell förändring
  const isPositive = changePercent > 0; // Avgör om trenden är uppåt eller nedåt

  return (
    <Box
      sx={{
        padding: { xs: '12px', sm: '16px' },
        background: 'linear-gradient(135deg, #2e2e2e, #1e1e1e)',
        borderRadius: '12px',
        textAlign: 'center',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4)',
        animation: `${pulse} 2s infinite ease-in-out`,
        // transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        // '&:hover': {
        //   transform: 'translateY(-3px)',
        //   boxShadow: '0 8px 16px rgba(0, 230, 118, 0.3)',
        // },
      }}
    >
      {/* Rubrik */}
      <Box display="flex" alignItems="center" mb={1}>
        <TrendingUpIcon
          sx={{
            color: '#00e676',
            fontSize: { xs: '1.2rem', sm: '1.5rem' },
            mr: 1,
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            color: '#ccc',
            fontSize: { xs: '0.9rem', sm: '1rem' },
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 500,
          }}
        >
          Aktiepris
        </Typography>
      </Box>

      {/* Pris och trendindikator */}
      {loading ? (
        <CircularProgress
          size={24}
          sx={{
            color: '#00e676',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : error ? (
        <Typography
          variant="body2"
          sx={{
            color: '#ff5722',
            fontSize: { xs: '0.85rem', sm: '0.9rem' },
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 400,
            px: 2,
          }}
        >
          {error}
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Box display="flex" alignItems="baseline">
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                fontFamily: "'Roboto Mono', monospace",
                fontWeight: 700,
                background: 'linear-gradient(45deg, #00e676, #66ffa6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '2px',
              }}
            >
              {price?.toLocaleString('sv-SE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || 'N/A'}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#ccc',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                fontFamily: "'Roboto Mono', monospace",
                ml: 1,
              }}
            >
              SEK
            </Typography>
          </Box>

          {/* Trendindikator */}
          {changePercent !== undefined && (
            <Box display="flex" alignItems="center" mt={0.5}>
              {isPositive ? (
                <ArrowUpwardIcon sx={{ color: '#00e676', fontSize: { xs: '1rem', sm: '1.2rem' }, mr: 0.5 }} />
              ) : (
                <ArrowDownwardIcon sx={{ color: '#ff5722', fontSize: { xs: '1rem', sm: '1.2rem' }, mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                sx={{
                  color: isPositive ? '#00e676' : '#ff5722',
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                  fontFamily: "'Roboto Mono', monospace",
                }}
              >
                {changePercent > 0 ? '+' : ''}
                {changePercent?.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}%
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StockPrice;