export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ensureRecentBuybackSync, syncBuybacks } from '@/lib/buybacksSync';

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? '0') === '1';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    if (!BUYBACKS_ACTIVE) {
      return jsonResponse({ ok: false, error: 'Buybacks program is inactive' }, 409);
    }
    const result = await ensureRecentBuybackSync();
    return jsonResponse(result, 200);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    if (!BUYBACKS_ACTIVE) {
      return jsonResponse({ ok: false, error: 'Buybacks program is inactive' }, 409);
    }
    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const url = payload?.url;
    if (url && !/mfn\.se\//.test(String(url))) {
      return jsonResponse({ error: 'Invalid MFN url' }, 400);
    }
    const result = await syncBuybacks({ url });
    if (!url && !result.processedUrls?.length && !result.added) {
      return jsonResponse({ message: 'No buyback releases discovered', ...result }, 200);
    }
    if (result.added === 0) {
      return jsonResponse({ message: 'No new rows', ...result }, 200);
    }
    return jsonResponse(result, 200);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
