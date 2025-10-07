export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ensureRecentBuybackSync, readBuybackFiles } from '@/lib/buybacksSync';

function isMondayInStockholm(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Europe/Stockholm',
  }).format(date);
  return weekday === 'Mon';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';
  const shouldSync = force || isMondayInStockholm();

  if (shouldSync) {
    try {
      await ensureRecentBuybackSync();
    } catch (err) {
      console.error('Auto buyback sync failed:', err.message);
    }
  }

  try {
    const { oldData, curData } = await readBuybackFiles();
    return new Response(
      JSON.stringify({ old: oldData, current: curData, updatedAt: new Date().toISOString() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
