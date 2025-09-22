export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

const EVO_LEI = '549300SUH6ZR1RF6TA88';
const DATA_FILE = path.join(process.cwd(), 'src', 'app', 'data', 'shortHistory.json');

function parseNumber(s) {
  if (s == null) return null;
  const t = String(s).replace(/\u00A0/g, ' ').replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
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

function extractTotalPercent(html, lei) {
  try {
    const re = new RegExp(`<td\s*>${lei}<\\/td>[\\s\\S]*?<td[^>]*class=['\"]numeric['\"][^>]*>(.*?)<\\/td>`, 'i');
    const m = re.exec(html);
    if (m) return parseNumber(m[1]);
  } catch {}
  return null;
}

function stockholmDateYMD(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const y = parts.find(p=>p.type==='year')?.value || '0000';
    const m = parts.find(p=>p.type==='month')?.value || '00';
    const da = parts.find(p=>p.type==='day')?.value || '00';
    return `${y}-${m}-${da}`;
  } catch { return new Date().toISOString().slice(0,10); }
}

export async function POST(request) {
  try {
    const url = 'https://www.fi.se/sv/vara-register/blankningsregistret/';
    const html = await fetchText(url);
    const total = extractTotalPercent(html, EVO_LEI);
    if (total == null) return new Response(JSON.stringify({ error: 'Could not extract total percent' }), { status: 422 });

    const today = stockholmDateYMD();
    const raw = await fs.readFile(DATA_FILE, 'utf8').catch(() => '[]');
    let arr = [];
    try { arr = JSON.parse(raw); } catch { arr = []; }
    // If last entry is today, replace; else append
    if (arr.length > 0 && arr[arr.length - 1].date === today) {
      arr[arr.length - 1] = { date: today, percent: +total.toFixed(2) };
    } else {
      arr.push({ date: today, percent: +total.toFixed(2) });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return new Response(JSON.stringify({ ok: true, date: today, percent: +total.toFixed(2) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET(request) {
  // Convenience: trigger snapshot via GET too
  return POST(request);
}

