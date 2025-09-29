import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'app', 'data');
const OLDFILE = path.join(DATA_DIR, 'oldBuybackData.json');
const CURFILE = path.join(DATA_DIR, 'buybackData.json');

const FEED_URLS = [
  'https://mfn.se/all/a/evolution',
  'https://www.mfn.se/all/a/evolution',
];

const BUYBACK_KEYWORDS = [
  'own share',
  'own shares',
  'återköp',
  'förvärv av egna aktier',
  'share repurchase',
  'repurchase of own shares',
  'acquisition of own shares',
  'acquisitions of own shares',
];

const AUTO_SYNC_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
let lastAutoSync = 0;

function isSuspiciousRow(row) {
  if (!row) return false;
  const shares = Number(row.Antal_aktier || 0);
  const value = Number(row.Transaktionsvärde || 0);
  const explicitAvg = row.Snittkurs != null ? Number(row.Snittkurs) : null;
  const avgPrice = shares > 0 ? value / shares : explicitAvg ?? 0;
  if (shares <= 0) return false;
  if (shares < 100 && avgPrice > 2000) return true;
  if (avgPrice > 5000) return true;
  return false;
}

function hasSuspiciousValues(rows) {
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => isSuspiciousRow(row));
}

function parseSvNumber(input) {
  if (input == null) return null;
  let str = String(input)
    .replace(/\u00A0/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!str) return null;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    if (decimalSeparator === ',') {
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(str)) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      str = str.replace(/\./g, '');
    }
  }

  const value = parseFloat(str);
  return Number.isFinite(value) ? value : null;
}

function ymd(dateStr) {
  const s = String(dateStr).trim();
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d = new Date(s);
  } else {
    const months = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      maj: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      dec: 11,
    };
    const match = /^(\d{1,2})\s+([A-Za-zåäöÅÄÖ]{3})[A-Za-zåäöÅÄÖ]*\s+(\d{4})$/.exec(s.toLowerCase());
    if (match) {
      const day = parseInt(match[1], 10);
      const month = months[match[2].slice(0, 3)] ?? null;
      const year = parseInt(match[3], 10);
      if (month != null) d = new Date(Date.UTC(year, month, day));
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return res.text();
}

function stripTags(input) {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeAbsoluteUrl(href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (!href.startsWith('/')) href = `/${href}`;
  return `https://mfn.se${href}`;
}

function extractBuybackUrls(html, maxUrls = 5) {
  const urls = [];
  const seen = new Set();
  const anchorRegex = /<a\s+class="title-link item-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html))) {
    const href = makeAbsoluteUrl(match[1]);
    if (!href || seen.has(href)) continue;
    const titleAttrMatch = match[0].match(/title="([^"]*)"/i);
    const titleAttr = titleAttrMatch ? titleAttrMatch[1] : '';
    const linkText = stripTags(match[2]);
    const haystack = `${titleAttr} ${linkText}`.toLowerCase();
    const isBuyback = BUYBACK_KEYWORDS.some((kw) => haystack.includes(kw));
    if (!isBuyback) continue;
    seen.add(href);
    urls.push(href);
    if (urls.length >= maxUrls) break;
  }
  return urls;
}

function parseBuybackFromMfnHtml(html) {
  const tableMatch = html.match(/<div class=\"table-wrapper\">[\s\S]*?<table>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const tableHtml = tableMatch[1];
  const rowMatches = Array.from(tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)).map((r) => r[1]);
  const dataRows = rowMatches.slice(1);
  const rows = [];
  for (const row of dataRows) {
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((c) => c[1]);
    if (cells.length < 3) continue;
    const dateText = stripTags(cells[0]);
    const volText = stripTags(cells[1]);
    const avgText = stripTags(cells[2]);
    const txText = stripTags(cells[3] || '');
    const Datum = ymd(dateText);
    const Antal_aktier = parseSvNumber(volText) ? Math.round(parseSvNumber(volText)) : null;
    const Snittkurs = parseSvNumber(avgText);
    const Transaktionsvärde = parseSvNumber(txText)
      ? Math.round(parseSvNumber(txText))
      : Antal_aktier && Snittkurs
      ? Math.round(Antal_aktier * Snittkurs)
      : null;
    if (!Datum || !Antal_aktier || !Snittkurs || !Transaktionsvärde) continue;
    rows.push({ Datum, Antal_aktier, Snittkurs: +Snittkurs.toFixed(2), Transaktionsvärde });
  }
  return rows;
}

async function readJson(file) {
  const text = await fs.readFile(file, 'utf8');
  return JSON.parse(text);
}

async function writeJson(file, data) {
  const text = JSON.stringify(data, null, 2);
  await fs.writeFile(file, text, 'utf8');
}

async function discoverBuybackUrls(maxUrls = 5) {
  for (const feedUrl of FEED_URLS) {
    try {
      const html = await fetchText(feedUrl);
      const urls = extractBuybackUrls(html, maxUrls);
      if (urls.length) {
        return { urls, feedUrl };
      }
    } catch (err) {
      // Continue to next feed if fetch failed
    }
  }
  return { urls: [], feedUrl: null };
}

function normalizeRow(row) {
  return {
    Datum: row.Datum,
    Antal_aktier: row.Antal_aktier,
    Transaktionsvärde: row.Transaktionsvärde,
    Snittkurs: row.Snittkurs,
    Dagsvolym: row.Dagsvolym ?? 0,
    Procent_dagsvolym: row.Procent_dagsvolym ?? 0,
  };
}

export async function syncBuybacks({ url, maxCandidates = 5 } = {}) {
  const meta = {
    added: 0,
    processedUrls: [],
    errors: [],
    feedUrl: null,
  };

  let candidateUrls = [];
  if (url) {
    if (!/mfn\.se\//.test(String(url))) {
      throw new Error('Invalid MFN url');
    }
    candidateUrls = [url];
  } else {
    const discovered = await discoverBuybackUrls(maxCandidates);
    meta.feedUrl = discovered.feedUrl;
    candidateUrls = discovered.urls;
  }

  candidateUrls = Array.from(new Set(candidateUrls));
  if (!candidateUrls.length) {
    return meta;
  }

  const oldData = await readJson(OLDFILE).catch(() => []);
  const curData = await readJson(CURFILE).catch(() => []);
  const existingDates = new Set(oldData.map((row) => row.Datum));
  const curByDate = new Map(curData.map((row) => [row.Datum, row]));

  const additions = [];

  for (const candidate of candidateUrls) {
    try {
      const html = await fetchText(candidate);
      const rows = parseBuybackFromMfnHtml(html);
      if (!rows.length) {
        meta.errors.push(`No rows parsed from ${candidate}`);
        continue;
      }
      if (hasSuspiciousValues(rows)) {
        meta.errors.push(`Suspicious values detected in ${candidate}`);
        continue;
      }
      meta.processedUrls.push(candidate);
      for (const row of rows) {
        const normalized = normalizeRow(row);
        curByDate.set(normalized.Datum, normalized);

        const idx = oldData.findIndex((item) => item.Datum === normalized.Datum);
        if (idx >= 0) {
          oldData[idx] = { ...oldData[idx], ...normalized };
          meta.replaced = (meta.replaced || 0) + 1;
          continue;
        }
        if (existingDates.has(normalized.Datum)) continue;
        existingDates.add(normalized.Datum);
        oldData.push(normalized);
        additions.push(normalized);
      }
    } catch (err) {
      meta.errors.push(`${candidate}: ${err.message}`);
    }
  }

  if (!additions.length) {
    // Even without new additions, we still want to persist any replacements or pruning below.
  }

  const newOld = [...oldData].sort((a, b) => new Date(a.Datum) - new Date(b.Datum));
  const newCur = Array.from(curByDate.values()).sort((a, b) => new Date(a.Datum) - new Date(b.Datum));

  let pruned = 0;
  const cleanedOld = newOld.filter((row) => {
    if (isSuspiciousRow(row)) {
      pruned += 1;
      return false;
    }
    return true;
  });
  const cleanedCur = newCur.filter((row) => !isSuspiciousRow(row));

  await writeJson(OLDFILE, cleanedOld);
  await writeJson(CURFILE, cleanedCur);

  meta.added = additions.length;
  if (pruned) meta.pruned = pruned;
  return meta;
}

export async function ensureRecentBuybackSync(options = {}) {
  const { maxAgeMs = AUTO_SYNC_WINDOW_MS, ...rest } = options;
  const now = Date.now();
  if (lastAutoSync && now - lastAutoSync < maxAgeMs) {
    try {
      const { curData } = await readBuybackFiles();
      if (!hasSuspiciousValues(curData)) {
        return { added: 0, skipped: true };
      }
    } catch {
      // fall through to force sync on read failures
    }
  }
  try {
    const result = await syncBuybacks(rest);
    lastAutoSync = Date.now();
    return result;
  } catch (err) {
    lastAutoSync = Date.now();
    throw err;
  }
}

export async function readBuybackFiles() {
  const [oldData, curData] = await Promise.all([
    readJson(OLDFILE).catch(() => []),
    readJson(CURFILE).catch(() => []),
  ]);
  return { oldData, curData };
}
