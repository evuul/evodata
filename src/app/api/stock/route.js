import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol'); // Hämta aktiesymbolen från query-parametern

  if (!symbol) {
    return NextResponse.json({ error: 'Stock symbol required' }, { status: 400 });
  }

  try {
    // Hämta aktuell aktiekurs och marknadsvärde
    const quote = await yahooFinance.quote(symbol);
    if (!quote) {
      return NextResponse.json({ error: `No data found for symbol ${symbol}` }, { status: 404 });
    }

    // Hämta historisk data för att beräkna YTD och dagar med uppgång/nedgång
    const historicalData = await yahooFinance.historical(symbol, {
      period1: '2025-01-01', // Startdatum: 1 jan 2025
      period2: new Date(), // Slutdatum: idag (9 april 2025)
      interval: '1d', // Dagliga priser
    });

    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ error: `No historical data found for symbol ${symbol}` }, { status: 404 });
    }

    // Hitta priset från den första tillgängliga dagen 2025
    const startOfYearData = historicalData.find(data => data.date >= new Date('2025-01-01'));
    const startOfYearPrice = startOfYearData ? startOfYearData.close : null;

    if (!startOfYearPrice) {
      return NextResponse.json({ error: 'Could not find start of year price for 2025' }, { status: 404 });
    }

    // Beräkna YTD-procentförändring
    const currentPrice = quote.regularMarketPrice;
    const ytdChangePercent = ((currentPrice - startOfYearPrice) / startOfYearPrice) * 100;

    // Räkna dagar med uppgång och nedgång
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < historicalData.length; i++) {
      const previousClose = historicalData[i - 1].close;
      const currentClose = historicalData[i].close;
      const dailyChange = currentClose - previousClose;

      if (dailyChange > 0) {
        gains++; // Uppgång
      } else if (dailyChange < 0) {
        losses++; // Nedgång
      }
      // Dagar med oförändrat pris (dailyChange === 0) räknas inte
    }

    return NextResponse.json({
      price: {
        regularMarketPrice: {
          raw: quote.regularMarketPrice,
        },
        regularMarketChangePercent: {
          raw: quote.regularMarketChangePercent,
        },
      },
      marketCap: quote.marketCap, // Lägg till marknadsvärde i SEK
      ytdChangePercent: ytdChangePercent,
      daysWithGains: gains,
      daysWithLosses: losses,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}