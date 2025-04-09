// // src/hooks/useStockPrice.js
// import { useState, useEffect } from 'react';

// // In-memory cache för att lagra aktiepriser
// const priceCache = new Map();

// // Funktion för att hämta data från localStorage
// const getCachedPriceFromLocalStorage = (symbol) => {
//   try {
//     const cached = localStorage.getItem(`stockPrice_${symbol}`);
//     if (!cached) return null;
//     const { data, timestamp } = JSON.parse(cached);
//     const cacheAge = Date.now() - timestamp;
//     const cacheTTL = 5 * 60 * 1000; // 5 minuter i millisekunder
//     if (cacheAge < cacheTTL) {
//       return data;
//     }
//     // Om cachen är för gammal, ta bort den
//     localStorage.removeItem(`stockPrice_${symbol}`);
//     return null;
//   } catch (error) {
//     console.error('Error reading from localStorage:', error);
//     return null;
//   }
// };

// // Funktion för att spara data till localStorage
// const setCachedPriceToLocalStorage = (symbol, data) => {
//   try {
//     const cacheEntry = {
//       data,
//       timestamp: Date.now(),
//     };
//     localStorage.setItem(`stockPrice_${symbol}`, JSON.stringify(cacheEntry));
//   } catch (error) {
//     console.error('Error writing to localStorage:', error);
//   }
// };

// const useStockPrice = (symbol, updateInterval = 300000) => {
//   const [stockPrice, setStockPrice] = useState(() => {
//     // Försök hämta från localStorage vid första laddning
//     return getCachedPriceFromLocalStorage(symbol) || null;
//   });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [requestCount, setRequestCount] = useState(0); // För att logga antalet anrop

//   const fetchStockPrice = async () => {
//     // Kontrollera om vi har en giltig cache i minnet
//     const cachedPrice = priceCache.get(symbol);
//     const cacheTTL = updateInterval; // Samma TTL som updateInterval (5 minuter som standard)
//     const now = Date.now();

//     if (cachedPrice && (now - cachedPrice.timestamp) < cacheTTL) {
//       // Använd cachat pris om det inte är för gammalt
//       setStockPrice(cachedPrice.data);
//       setError(null);
//       setLoading(false);
//       console.log(`Using cached price for ${symbol} from in-memory cache`);
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await fetch(`/api/stock?symbol=${symbol}`);
//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }
//       const data = await response.json();
//       if (data.error) {
//         throw new Error(data.error);
//       }

//       // Spara i in-memory cache
//       priceCache.set(symbol, {
//         data,
//         timestamp: now,
//       });

//       // Spara i localStorage
//       setCachedPriceToLocalStorage(symbol, data);

//       setStockPrice(data);
//       setError(null);
//       setRequestCount((prev) => prev + 1);
//       console.log(`Totala API-anrop i useStockPrice för ${symbol}: ${requestCount + 1}`);
//     } catch (err) {
//       setError('Kunde inte hämta aktiepriset.');
//       console.error('Error fetching stock price:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Hämta priset direkt vid första laddning
//     fetchStockPrice();

//     // Uppdatera priset regelbundet
//     const interval = setInterval(fetchStockPrice, updateInterval); // Standard: var 5:e minut
//     return () => clearInterval(interval); // Rensa intervallet vid avmontering
//   }, [symbol, updateInterval]);

//   return { stockPrice, loading, error };
// };

// export default useStockPrice;