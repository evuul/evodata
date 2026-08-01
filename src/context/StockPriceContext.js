'use client';

// Provides the latest stock quote and derived market metrics to client components.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchStockQuoteShared } from '@/lib/quoteFxClient';
import { subscribeLiveDataSource } from '@/lib/liveDataCoordinator';

const StockPriceContext = createContext();

export const StockPriceProvider = ({ children, stockSymbol = 'EVO.ST', updateInterval = 300000, enabled = true }) => {
  const [stockPrice, setStockPrice] = useState(null);
  const [ytdChangePercent, setYtdChangePercent] = useState(null);
  const [daysWithGains, setDaysWithGains] = useState(null);
  const [daysWithLosses, setDaysWithLosses] = useState(null);
  const [marketCap, setMarketCap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataStatus, setDataStatus] = useState('idle');

  const fetchStockPrice = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!enabled) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await fetchStockQuoteShared(stockSymbol, { force });
      const data = result.data;
      setStockPrice(data);
      setYtdChangePercent(data.ytdChangePercent);
      setDaysWithGains(data.daysWithGains);
      setDaysWithLosses(data.daysWithLosses);
      setMarketCap(data.marketCap);
      setDataStatus(result.status);
      setLastUpdated(new Date(data.generatedAt || result.updatedAt || Date.now()));
      if (result.error) setError('Visar senast tillgängliga aktiekurs');
    } catch {
      setError('Kunde inte hämta aktiekursen');
      setDataStatus('error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled, stockSymbol]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchStockPrice();
    return subscribeLiveDataSource(
      `stock:${stockSymbol}`,
      () => fetchStockPrice({ force: true, silent: true }),
      updateInterval
    );
  }, [enabled, fetchStockPrice, stockSymbol, updateInterval]);

  return (
    <StockPriceContext.Provider
      value={{
        stockPrice,
        ytdChangePercent,
        daysWithGains,
        daysWithLosses,
        marketCap,
        loading,
        error,
        lastUpdated,
        dataStatus,
        refresh: () => fetchStockPrice({ force: true }),
      }}
    >
      {children}
    </StockPriceContext.Provider>
  );
};

export const useStockPriceContext = () => useContext(StockPriceContext);
