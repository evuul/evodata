import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol'); // Hämta aktiesymbolen från query-parametern

  if (!symbol) {
    return NextResponse.json({ error: 'Stock symbol required' }, { status: 400 });
  }

  try {
    const quote = await yahooFinance.quote(symbol);
    if (!quote) {
      return NextResponse.json({ error: `No data found for symbol ${symbol}` }, { status: 404 });
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
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}