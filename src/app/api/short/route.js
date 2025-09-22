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

async function fetchArrayBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0; +https://evodata.app)',
      'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      'Referer': 'https://www.fi.se/sv/vara-register/blankningsregistret/',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.arrayBuffer();
}

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

    // 2) Hämta publika positioner (>0,5%) från ODS (Aktuella positioner)
    let publicPositions = [];
    let publicSum = 0;
    let publicPositionsError = '';
    try {
      const buf = await fetchArrayBuffer('https://www.fi.se/sv/vara-register/blankningsregistret/GetAktuellFile/');
      // Dynamisk import för att undvika tyngd vid edge (hantera både default- och named-export)
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod && XLSXmod.default ? XLSXmod.default : XLSXmod;
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (Array.isArray(rows) && rows.length > 0) {
        const keys = Object.keys(rows[0] || {});
        const keyLei = pickColumnKey(keys, ['lei']);
        const keyPct = pickColumnKey(keys, ['blankning', 'procent', '%', 'netto']);
        const keyMgr = pickColumnKey(keys, ['innehavare', 'manager', 'positionsinnehavare', 'positionsinnehavarens', 'position holder']);
        const keyDate = pickColumnKey(keys, ['datum', 'date']);
        for (const r of rows) {
          const vLei = (r[keyLei] || '').toString().trim();
          if (!vLei || vLei !== lei) continue;
          const pct = parseSwedishNumber(r[keyPct]);
          if (pct == null) continue;
          const manager = (r[keyMgr] || '').toString().trim();
          const dateStr = (r[keyDate] || '').toString().trim();
          publicPositions.push({ manager, percent: pct, date: dateStr });
          publicSum += pct;
        }
      }
    } catch (e) {
      publicPositionsError = 'Kunde inte läsa publika positioner (ODS)';
    }

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
