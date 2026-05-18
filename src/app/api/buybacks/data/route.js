export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ensureRecentBuybackSync, readBuybackFiles } from '@/lib/buybacksSync';
import buybackDataDefault from '../../../data/buybackData.json';
import oldBuybackDataDefault from '../../../data/oldBuybackData.json';

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? '1') === '1';

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
  const shouldSync = BUYBACKS_ACTIVE && (force || isMondayInStockholm());
  let syncError = null;

  if (shouldSync) {
    try {
      await ensureRecentBuybackSync();
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
      console.error('Auto buyback sync failed:', syncError);
    }
  }

  try {
    const { oldData, curData } = await readBuybackFiles();
    return new Response(
      JSON.stringify({
        old: oldData,
        current: curData,
        updatedAt: new Date().toISOString(),
        buybacksActive: BUYBACKS_ACTIVE,
        syncError,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        old: oldBuybackDataDefault,
        current: buybackDataDefault,
        updatedAt: new Date().toISOString(),
        buybacksActive: BUYBACKS_ACTIVE,
        syncError: syncError || (err instanceof Error ? err.message : String(err)),
        fallback: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
