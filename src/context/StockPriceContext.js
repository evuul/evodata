'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const StockPriceContext = createContext();

export const StockPriceProvider = ({ children }) => {
  const [stockPrice, setStockPrice] = useState(null);
  const [ytdChangePercent, setYtdChangePercent] = useState(null);
  const [daysWithGains, setDaysWithGains] = useState(null);
  const [daysWithLosses, setDaysWithLosses] = useState(null);
  const [marketCap, setMarketCap] = useState(null); // Ny state för marknadsvärde
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStockPrice = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stock?symbol=EVO.ST');
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
  };

  useEffect(() => {
    fetchStockPrice();
    const interval = setInterval(fetchStockPrice, 300000); // Uppdatera varje minut
    return () => clearInterval(interval);
  }, []);

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
