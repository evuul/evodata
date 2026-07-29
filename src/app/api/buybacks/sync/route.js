// Runs protected buyback synchronization jobs.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { syncBuybacks } from '@/lib/buybacksSync';
import { requireCronAuth, resolveCronSecret } from '@/lib/cronAuth';
import { logApiError } from '@/lib/apiErrors';
import { normalizeMfnUrl } from '@/lib/buybackRequestValidation';

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? '1') === '1';
const SECRET = resolveCronSecret(process.env.BUYBACKS_SYNC_SECRET, process.env.CRON_SECRET);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
  });
}

export async function POST(request) {
  const auth = requireCronAuth(request, SECRET, 'Buyback sync is not configured');
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);

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
    const requestedUrl = payload?.url;
    const url = normalizeMfnUrl(requestedUrl);
    if (requestedUrl && !url) {
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
    logApiError({ route: 'buybacks/sync', stage: 'sync', error: err });
    return jsonResponse({ ok: false, error: 'Buyback sync failed' }, 500);
  }
}
