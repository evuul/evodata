// Simple EUR->SEK FX rate with in-memory cache
// Uses exchangerate.host (no key) and caches for 6 hours

let cache = { value: null, ts: 0 };
const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cache.value && now - cache.ts < SIX_HOURS) {
    return new Response(JSON.stringify(cache.value), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  try {
    const url = 'https://api.exchangerate.host/latest?base=EUR&symbols=SEK';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('fx fetch failed');
    const data = await res.json();
    const rate = data?.rates?.SEK;
    if (!rate || !isFinite(rate)) throw new Error('fx invalid');
    const payload = { base: 'EUR', quote: 'SEK', rate, updatedAt: new Date().toISOString(), source: 'exchangerate.host' };
    cache = { value: payload, ts: now };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (e) {
    const payload = { base: 'EUR', quote: 'SEK', rate: 11.02, updatedAt: new Date().toISOString(), source: 'fallback' };
    cache = { value: payload, ts: now };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
}

