// Serves stored buyback data without triggering synchronization side effects.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { readBuybackFiles } from '@/lib/buybacksSync';
import { combineBuybackSnapshots } from '@/lib/buybackSnapshots';
import buybackDataDefault from '../../../data/buybackData.json';
import oldBuybackDataDefault from '../../../data/oldBuybackData.json';

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? '1') === '1';

export async function GET() {
  try {
    const { oldData, curData } = await readBuybackFiles();
    const combined = combineBuybackSnapshots(oldData, curData);
    return new Response(
      JSON.stringify({
        old: oldData,
        current: curData,
        combined,
        updatedAt: new Date().toISOString(),
        buybacksActive: BUYBACKS_ACTIVE,
        syncError: null,
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
        combined: combineBuybackSnapshots(oldBuybackDataDefault, buybackDataDefault),
        updatedAt: new Date().toISOString(),
        buybacksActive: BUYBACKS_ACTIVE,
        syncError: 'Live buyback data is temporarily unavailable',
        fallback: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
