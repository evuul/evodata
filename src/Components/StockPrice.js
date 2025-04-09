'use client';
import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useStockPriceContext } from '../context/StockPriceContext';

const StockPrice = () => {
  const { stockPrice, loading, error, lastUpdated } = useStockPriceContext();

  const price = stockPrice?.price?.regularMarketPrice?.raw;
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw;
  const isPositive = changePercent > 0;
  const isUnchanged = changePercent === 0; // Kontrollera om förändringen är 0%

  // Bestäm färgen för priset baserat på förändringen
  const priceColorStyle = isUnchanged
    ? { color: '#fff' } // Vitt vid oförändrat
    : {
        background: isPositive
          ? 'linear-gradient(45deg, #00e676, #66ffa6)' // Grön gradient vid positiv
          : 'linear-gradient(45deg, #ff5722, #ff8a65)', // Röd gradient vid negativ
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      };

  // Bestäm färgen för procentförändringen och ikonerna
  const changeColor = isUnchanged ? '#fff' : isPositive ? '#00e676' : '#ff5722';

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
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
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                fontFamily: "'Roboto Mono', monospace",
                fontWeight: 700,
                letterSpacing: '2px',
                ...priceColorStyle, // Applicera dynamisk färg
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

          {changePercent !== undefined && (
            <Box display="flex" alignItems="center" mt={0.5}>
              {isPositive ? (
                <ArrowUpwardIcon sx={{ color: changeColor, fontSize: { xs: '1rem', sm: '1.2rem' }, mr: 0.5 }} />
              ) : isUnchanged ? (
                <></> // Ingen ikon vid oförändrat
              ) : (
                <ArrowDownwardIcon sx={{ color: changeColor, fontSize: { xs: '1rem', sm: '1.2rem' }, mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                sx={{
                  color: changeColor, // Använd samma dynamiska färg
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

          {lastUpdated && (
            <Typography
              variant="body2"
              sx={{
                color: '#ccc',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontFamily: "'Roboto', sans-serif",
                mt: 1,
              }}
            >
              Senast uppdaterad: {lastUpdated.toLocaleTimeString('sv-SE')}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StockPrice;