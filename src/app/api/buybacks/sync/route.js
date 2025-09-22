export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'app', 'data');
const OLDFILE = path.join(DATA_DIR, 'oldBuybackData.json');
const CURFILE = path.join(DATA_DIR, 'buybackData.json');

function parseSvNumber(s) {
  if (s == null) return null;
  const t = String(s).replace(/\u00A0/g, ' ').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
  const v = parseFloat(t);
  return isFinite(v) ? v : null;
}

function ymd(dateStr) {
  // Try formats like 2025-09-22 or 22-09-2025 or 22 sep 2025
  const s = String(dateStr).trim();
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s);
  else {
    // Try DD Mon YYYY in Swedish months
    const months = {
      'jan':0,'feb':1,'mar':2,'apr':3,'maj':4,'jun':5,'jul':6,'aug':7,'sep':8,'okt':9,'nov':10,'dec':11
    };
    const m = /^(\d{1,2})\s+([A-Za-zåäöÅÄÖ]{3})[A-Za-zåäöÅÄÖ]*\s+(\d{4})$/.exec(s.toLowerCase());
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = months[m[2].slice(0,3)] ?? null;
      const year = parseInt(m[3], 10);
      if (mon != null) d = new Date(Date.UTC(year, mon, day));
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0)' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

function parseBuybackFromMfnHtml(html) {
  // Find first table with headers containing Datum & Aggregerad daglig volym
  const tableMatch = html.match(/<div class=\"table-wrapper\">[\s\S]*?<table>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const tableHtml = tableMatch[1];
  const rowMatches = Array.from(tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)).map(m => m[1]);
  // Skip header row
  const dataRows = rowMatches.slice(1);
  const rows = [];
  for (const row of dataRows) {
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(m => m[1]);
    if (cells.length < 3) continue;
    const dateText = cells[0].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const volText = cells[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const avgText = cells[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const txText = (cells[3] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const Datum = ymd(dateText);
    const Antal_aktier = parseSvNumber(volText) ? Math.round(parseSvNumber(volText)) : null;
    const Snittkurs = parseSvNumber(avgText);
    const Transaktionsvärde = parseSvNumber(txText) ? Math.round(parseSvNumber(txText)) : (Antal_aktier && Snittkurs ? Math.round(Antal_aktier * Snittkurs) : null);
    if (!Datum || !Antal_aktier || !Snittkurs || !Transaktionsvärde) continue;
    rows.push({ Datum, Antal_aktier, Snittkurs: +Snittkurs.toFixed(2), Transaktionsvärde });
  }
  return rows;
}

async function readJson(file) {
  const buf = await fs.readFile(file, 'utf8');
  return JSON.parse(buf);
}
async function writeJson(file, data) {
  const text = JSON.stringify(data, null, 2);
  await fs.writeFile(file, text, 'utf8');
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || !/mfn\.se\//.test(String(url))) {
      return new Response(JSON.stringify({ error: 'Invalid or missing MFN url' }), { status: 400 });
    }
    // Load MFN page and parse HTML table with daily rows
    const html = await fetchText(url);
    const rows = parseBuybackFromMfnHtml(html);
    if (!rows.length) {
      return new Response(JSON.stringify({ error: 'Could not parse buyback rows from MFN HTML' }), { status: 422 });
    }

    // Load existing data
    const oldData = await readJson(OLDFILE).catch(() => []);
    const curData = await readJson(CURFILE).catch(() => []);
    const existingDates = new Set(oldData.map(r => r.Datum));
    const toAdd = rows.filter(r => !existingDates.has(r.Datum));
    if (!toAdd.length) {
      return new Response(JSON.stringify({ message: 'No new rows', added: 0 }), { status: 200 });
    }
    // Append with default values for missing fields
    const normalized = toAdd.map(r => ({
      Datum: r.Datum,
      Antal_aktier: r.Antal_aktier,
      Transaktionsvärde: r.Transaktionsvärde,
      Snittkurs: r.Snittkurs,
      Dagsvolym: r.Dagsvolym ?? 0,
      Procent_dagsvolym: r.Procent_dagsvolym ?? 0,
    }));
    const newOld = [...oldData, ...normalized].sort((a,b)=> new Date(a.Datum) - new Date(b.Datum));

    // Update current program data (buybackData.json) by merging or appending for same dates
    const curByDate = new Map(curData.map(r => [r.Datum, r]));
    for (const r of normalized) curByDate.set(r.Datum, r);
    const newCur = Array.from(curByDate.values()).sort((a,b)=> new Date(a.Datum) - new Date(b.Datum));

    await writeJson(OLDFILE, newOld);
    await writeJson(CURFILE, newCur);

    return new Response(JSON.stringify({ added: normalized.length, source: 'mfn-html' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
