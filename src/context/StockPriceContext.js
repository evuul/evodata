'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StockPriceContext = createContext();

export const StockPriceProvider = ({ children, stockSymbol = 'EVO.ST', updateInterval = 300000, enabled = true }) => {
  const [stockPrice, setStockPrice] = useState(null);
  const [ytdChangePercent, setYtdChangePercent] = useState(null);
  const [daysWithGains, setDaysWithGains] = useState(null);
  const [daysWithLosses, setDaysWithLosses] = useState(null);
  const [marketCap, setMarketCap] = useState(null); // Ny state för marknadsvärde
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStockPrice = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(stockSymbol)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock price');
      }
      const data = await response.json();
      setStockPrice(data);
      setYtdChangePercent(data.ytdChangePercent);
      setDaysWithGains(data.daysWithGains);
      setDaysWithLosses(data.daysWithLosses);
      setMarketCap(data.marketCap); // Spara marknadsvärde
      setLastUpdated(new Date());
    } catch (err) {
      setError('Kunde inte hämta aktiekursen');
    } finally {
      setLoading(false);
    }
  }, [enabled, stockSymbol]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchStockPrice();
    const interval = setInterval(fetchStockPrice, updateInterval);
    return () => clearInterval(interval);
  }, [enabled, fetchStockPrice, updateInterval]);

  return (
    <StockPriceContext.Provider
      value={{
        stockPrice,
        ytdChangePercent,
        daysWithGains,
        daysWithLosses,
        marketCap, // Gör marknadsvärde tillgängligt
        loading,
        error,
        lastUpdated,
        refresh: fetchStockPrice,
      }}
    >
      {children}
    </StockPriceContext.Provider>
  );
};

export const useStockPriceContext = () => useContext(StockPriceContext);
