export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVO_LEI = '549300SUH6ZR1RF6TA88';

function parseSwedishNumber(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\u00A0/g, ' ').replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
  const v = parseFloat(t);
  return isFinite(v) ? v : null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0; +https://evodata.app)',
      'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      'Referer': 'https://www.fi.se/sv/vara-register/blankningsregistret/',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

// ODS-hämtning borttagen – vi visar endast totalsumma och länkar till FI

function extractTotalPercentFromHtml(html, lei) {
  try {
    const re = new RegExp(`<td\s*>${lei}<\\/td>[\\s\\S]*?<td[^>]*class=['\"]numeric['\"][^>]*>(.*?)<\\/td>`, 'i');
    const m = re.exec(html);
    if (m) {
      return parseSwedishNumber(m[1]);
    }
  } catch {}
  return null;
}

function pickColumnKey(keys, patterns) {
  const lower = keys.map(k => ({ k, lk: k.toLowerCase() }));
  for (const p of patterns) {
    const idx = lower.findIndex(o => o.lk.includes(p));
    if (idx >= 0) return lower[idx].k;
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lei = searchParams.get('lei') || EVO_LEI;

  try {
    // 1) Hämta total blankning från list-sidan
    const listHtml = await fetchText('https://www.fi.se/sv/vara-register/blankningsregistret/');
    const totalPercent = extractTotalPercentFromHtml(listHtml, lei);

    // 2) Publika positioner (>0,5%) – inte inkluderade längre i API:t
    let publicPositions = [];
    let publicSum = 0;
    let publicPositionsError = '';

    const total = typeof totalPercent === 'number' ? totalPercent : null;
    const pub = Number.isFinite(publicSum) ? +(publicSum.toFixed(2)) : 0;
    const nonPublicPercent = total != null ? Math.max(0, +(total - pub).toFixed(2)) : null;

    const body = {
      lei,
      totalPercent: total,
      publicPercent: pub,
      nonPublicPercent,
      publicPositions,
      publicPositionsError,
      source: 'Finansinspektionen',
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
