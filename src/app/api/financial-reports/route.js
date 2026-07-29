// Serves validated financial reports with cacheable local fallback data.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import localReports from '@/app/data/financialReports.json';
import { logApiError } from '@/lib/apiErrors';
import { buildFinancialReportsPayload } from '@/lib/financialReportsResponse';

const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

async function fetchRemoteReports(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const data = await res.json();
  return buildFinancialReportsPayload(data, { source: 'remote' });
}

export async function GET() {
  const remoteUrl = process.env.FINANCIAL_REPORTS_URL;
  if (remoteUrl) {
    try {
      const remoteData = await fetchRemoteReports(remoteUrl);
      return new Response(JSON.stringify(remoteData), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
      });
    } catch (err) {
      logApiError({ route: 'financial-reports', stage: 'remote-fetch', error: err });
    }
  }

  const fallbackData = buildFinancialReportsPayload(localReports, {
    source: 'local',
    fallback: Boolean(remoteUrl),
  });
  return new Response(JSON.stringify(fallbackData), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
  });
}
