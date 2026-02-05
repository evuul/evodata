export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import localReports from '@/app/data/financialReports.json';

async function fetchRemoteReports(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return res.json();
}

export async function GET() {
  const remoteUrl = process.env.FINANCIAL_REPORTS_URL;
  if (remoteUrl) {
    try {
      const remoteData = await fetchRemoteReports(remoteUrl);
      return new Response(JSON.stringify(remoteData), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    } catch (err) {
      // fall back to local data
      console.error('Failed to fetch remote financial reports:', err.message);
    }
  }

  return new Response(JSON.stringify(localReports), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
