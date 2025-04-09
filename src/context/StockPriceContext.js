'use client'; // Lägg till detta direktiv i toppen av filen

// src/context/StockPriceContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Skapa en context för aktiepriset
const StockPriceContext = createContext();

// In-memory cache för att lagra aktiepriser
const priceCache = new Map();

// Funktion för att hämta data från localStorage
const getCachedPriceFromLocalStorage = (symbol) => {
  try {
    const cached = localStorage.getItem(`stockPrice_${symbol}`);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    const cacheAge = Date.now() - timestamp;
    const cacheTTL = 5 * 60 * 1000; // 5 minuter i millisekunder
    if (cacheAge < cacheTTL) {
      return data;
    }
    // Om cachen är för gammal, ta bort den
    localStorage.removeItem(`stockPrice_${symbol}`);
    return null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

// Funktion för att spara data till localStorage
const setCachedPriceToLocalStorage = (symbol, data) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`stockPrice_${symbol}`, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

// Provider-komponent som hanterar aktiepriset globalt
export const StockPriceProvider = ({ children, stockSymbol = 'EVO.ST', updateInterval = 300000 }) => {
  const [stockPrice, setStockPrice] = useState(() => {
    // Försök hämta från localStorage vid första laddning
    return getCachedPriceFromLocalStorage(stockSymbol) || null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestCount, setRequestCount] = useState(0); // För att logga antalet anrop
  const [lastUpdated, setLastUpdated] = useState(null); // För senast uppdaterad

  const fetchStockPrice = async () => {
    // Kontrollera om vi har en giltig cache i minnet
    const cachedPrice = priceCache.get(stockSymbol);
    const cacheTTL = updateInterval; // Samma TTL som updateInterval (5 minuter som standard)
    const now = Date.now();

    if (cachedPrice && (now - cachedPrice.timestamp) < cacheTTL) {
      // Använd cachat pris om det inte är för gammalt
      setStockPrice(cachedPrice.data);
      setError(null);
      setLoading(false);
      setLastUpdated(new Date(cachedPrice.timestamp)); // Sätt lastUpdated från cachen
      console.log(`Using cached price for ${stockSymbol} from in-memory cache`);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/stock?symbol=${stockSymbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Spara i in-memory cache
      priceCache.set(stockSymbol, {
        data,
        timestamp: now,
      });

      // Spara i localStorage
      setCachedPriceToLocalStorage(stockSymbol, data);

      setStockPrice(data);
      setError(null);
      setRequestCount((prev) => prev + 1);
      setLastUpdated(new Date()); // Sätt lastUpdated vid nytt API-anrop
      console.log(`Totala API-anrop för ${stockSymbol}: ${requestCount + 1}`);
    } catch (err) {
      setError('Kunde inte hämta aktiepriset.');
      console.error('Error fetching stock price:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hämta priset direkt vid första laddning
    fetchStockPrice();

    // Uppdatera priset regelbundet
    const interval = setInterval(fetchStockPrice, updateInterval); // Standard: var 5:e minut
    return () => clearInterval(interval); // Rensa intervallet vid avmontering
  }, [stockSymbol, updateInterval]);

  return (
    <StockPriceContext.Provider value={{ stockPrice, loading, error, lastUpdated }}>
      {children}
    </StockPriceContext.Provider>
  );
};

// Hook för att använda contexten
export const useStockPriceContext = () => {
  const context = useContext(StockPriceContext);
  if (!context) {
    throw new Error('useStockPriceContext must be used within a StockPriceProvider');
  }
  return context;
};