import { load } from 'cheerio';
import { loadInsiderDataset, saveInsiderDataset } from '@/lib/insiderStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE_URL = 'https://marknadssok.fi.se';
const SEARCH_PATH = '/publiceringsklient/sv-SE/Search/Search';

const BASE_PARAMS = {
  SearchFunctionType: 'Insyn',
  button: 'search',
};

const SEARCH_VARIANTS = [
  {
    key: 'evo-current',
    params: {
      ...BASE_PARAMS,
      Utgivare: 'evolution',
      PersonILedandeStällningNamn: '',
      'Transaktionsdatum.From': '',
      'Transaktionsdatum.To': '',
      'Publiceringsdatum.From': '',
      'Publiceringsdatum.To': '',
    },
  },
  {
    key: 'evo-legacy',
    params: {
      ...BASE_PARAMS,
      Utgivare: 'evolution gaming',
    },
  },
];

const PAGE_DELAY_MS = 500;
const MAX_PAGE_RETRIES = 6;
const RETRY_DELAY_MS = 1500;
const DEFAULT_MAX_PAGES = 32;
const MAX_REMOTE_PAGES = 40;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Connection: 'close',
};

const normalizeText = (value) => (value ? value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() : '');

const parseSwedishNumber = (value) => {
  if (!value) return null;
  const normalized = value
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const toIsoDate = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoCandidate = `${trimmed}T00:00:00Z`;
  const date = new Date(isoCandidate);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const detectDirection = (typeText) => {
  if (!typeText) return null;
  const normalized = typeText.normalize('NFC').toLowerCase();
  const plain = normalized.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (
    normalized.includes('förvärv') ||
    plain.includes('forvarv') ||
    normalized.includes('köp') ||
    plain.includes('kop')
  ) {
    return 'buy';
  }
  if (
    normalized.includes('avyttr') ||
    plain.includes('avyttr') ||
    normalized.includes('sälj') ||
    plain.includes('salj') ||
    normalized.includes('försälj') ||
    plain.includes('forsalj')
  ) {
    return 'sell';
  }
  return null;
};

const buildSearchUrl = (page, paramsObject) => {
  const params = new URLSearchParams(paramsObject);
  if (page === 1) {
    params.set('Page', '1');
    return `${BASE_URL}${SEARCH_PATH}?${params.toString()}`;
  }
  params.set('paging', 'True');
  params.set('page', String(page));
  return `${BASE_URL}${SEARCH_PATH}/Insyn?${params.toString()}`;
};

const computeTotals = (items) => {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalCount += 1;
      if (item.direction === 'buy') {
        acc.buyCount += 1;
        if (Number.isFinite(item.volume)) acc.buyVolume += item.volume;
        if (Number.isFinite(item.valueSek)) acc.buyValueSek += item.valueSek;
      } else if (item.direction === 'sell') {
        acc.sellCount += 1;
        if (Number.isFinite(item.volume)) acc.sellVolume += item.volume;
        if (Number.isFinite(item.valueSek)) acc.sellValueSek += item.valueSek;
      }
      return acc;
    },
    {
      totalCount: 0,
      buyCount: 0,
      sellCount: 0,
      buyVolume: 0,
      sellVolume: 0,
      buyValueSek: 0,
      sellValueSek: 0,
    },
  );
  totals.netValueSek = totals.buyValueSek - totals.sellValueSek;
  return totals;
};

const sortAndDedupe = (items) => {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
};

const limitItemsForPages = (items, pages, rowsPerPage) => {
  if (!rowsPerPage || !Number.isFinite(rowsPerPage) || rowsPerPage <= 0) return items;
  if (!Number.isFinite(pages) || pages <= 0) return items;
  const limit = Math.max(1, Math.floor(pages)) * rowsPerPage;
  return items.slice(0, limit);
};

const extractPaginationMax = ($, currentPage) => {
  const pages = new Set([currentPage]);
  $('div.pagination li a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const url = new URL(href, BASE_URL);
      const value = url.searchParams.get('page') || url.searchParams.get('Page');
      if (value) {
        const num = Number(value);
        if (Number.isFinite(num)) pages.add(num);
      }
    } catch {}
  });
  return pages.size ? Math.max(...pages) : currentPage;
};

async function fetchPage(page, paramsObject, attempt = 1) {
  try {
    const url = buildSearchUrl(page, paramsObject);
    const refererParams = new URLSearchParams(paramsObject);
    const headers = {
      ...BASE_HEADERS,
      Referer: `${BASE_URL}${SEARCH_PATH}?${refererParams.toString()}`,
    };
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Fetch failed for page ${page} (${response.status})`);
    }
    const html = await response.text();
    const $ = load(html);

    const rows = [];
    $('table.table tbody tr').each((_, element) => {
      const $row = $(element);
      const cells = $row.find('td');
      if (cells.length < 16) return;

      const publishedDateText = normalizeText($(cells[0]).text());
      const transactionDateText = normalizeText($(cells[9]).text());
      const typeText = normalizeText($(cells[5]).text());
      const priceText = normalizeText($(cells[12]).text());
      const volumeText = normalizeText($(cells[10]).text());
      const detailsHref = $(cells[15]).find('a').attr('href');

      const currency = normalizeText($(cells[13]).text()) || null;
      const price = parseSwedishNumber(priceText);
      const volume = parseSwedishNumber(volumeText);
      const valueSek = currency === 'SEK' && price != null && volume != null ? price * volume : null;
      const detailsUrl = detailsHref ? new URL(detailsHref, BASE_URL).toString() : null;

      rows.push({
        id: detailsUrl || `page${page}-row${rows.length}`,
        publishedDate: publishedDateText || null,
        publishedAt: toIsoDate(publishedDateText),
        issuer: normalizeText($(cells[1]).text()) || null,
        person: normalizeText($(cells[2]).text()) || null,
        position: normalizeText($(cells[3]).text()) || null,
        relatedParty: normalizeText($(cells[4]).text()) || null,
        type: typeText || null,
        instrumentName: normalizeText($(cells[6]).text()) || null,
        instrumentType: normalizeText($(cells[7]).text()) || null,
        isin: normalizeText($(cells[8]).text()) || null,
        transactionDate: transactionDateText || null,
        transactionAt: toIsoDate(transactionDateText),
        volume,
        volumeText: volumeText || null,
        volumeUnit: normalizeText($(cells[11]).text()) || null,
        price,
        priceText: priceText || null,
        currency,
        valueSek,
        status: normalizeText($(cells[14]).text()) || null,
        detailsUrl,
        isInactive: ($row.attr('class') || '').includes('iprinactive'),
        direction: detectDirection(typeText),
      });
    });

    const totalPages = extractPaginationMax($, page);
    return { rows, totalPages };
  } catch (error) {
    if (attempt < MAX_PAGE_RETRIES) {
      await delay(RETRY_DELAY_MS * attempt);
      return fetchPage(page, paramsObject, attempt + 1);
    }
    throw error;
  }
}

const fetchPagesWithOptions = async ({ params, maxPages, knownIds = null, stopOnKnown = true }) => {
  const rows = [];
  let totalPages = 1;
  let rowsPerPage = null;
  let pagesFetched = 0;
  const limit = Math.min(Math.max(maxPages || DEFAULT_MAX_PAGES, 1), MAX_REMOTE_PAGES);

  outer: for (let page = 1; page <= limit; page += 1) {
    if (page > 1 && PAGE_DELAY_MS > 0) {
      await delay(PAGE_DELAY_MS);
    }
    const { rows: pageRows, totalPages: remoteTotal } = await fetchPage(page, params);
    pagesFetched = page;
    totalPages = remoteTotal;
    if (!rowsPerPage && pageRows.length) rowsPerPage = pageRows.length;

    for (const row of pageRows) {
      if (knownIds && knownIds.has(row.id)) {
        if (stopOnKnown) {
          break outer;
        }
        continue;
      }
      rows.push(row);
    }

    if (page >= totalPages) {
      break;
    }
  }

  return { rows, totalPages, rowsPerPage, pagesFetched };
};

const getSortTimestamp = (item) => {
  if (!item) return 0;
  const transactionTime = item.transactionAt ? Date.parse(item.transactionAt) : NaN;
  if (Number.isFinite(transactionTime)) return transactionTime;
  const publishedTime = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
  if (Number.isFinite(publishedTime)) return publishedTime;
  return 0;
};

const buildDataset = async ({ maxPages }) => {
  const knownIds = new Set();
  const combinedRows = [];
  const variantSummaries = [];
  let effectiveRowsPerPage = null;
  let combinedPagesFetched = 0;
  let combinedMaxPages = 0;

  for (const variant of SEARCH_VARIANTS) {
    const { rows, totalPages, rowsPerPage, pagesFetched } = await fetchPagesWithOptions({
      params: variant.params,
      maxPages,
      stopOnKnown: false,
    });

    for (const row of rows) {
      if (!knownIds.has(row.id)) {
        knownIds.add(row.id);
        combinedRows.push(row);
      }
    }

    if (!effectiveRowsPerPage && rowsPerPage) effectiveRowsPerPage = rowsPerPage;

    variantSummaries.push({
      key: variant.key,
      utgivare: variant.params.Utgivare,
      pagesFetched: Math.min(pagesFetched, maxPages, totalPages),
      maxAvailablePages: totalPages,
    });

    combinedPagesFetched += Math.min(pagesFetched, maxPages, totalPages);
    combinedMaxPages += totalPages;
  }

  const sorted = sortAndDedupe(combinedRows);
  const effectiveRows = effectiveRowsPerPage || (sorted.length && combinedPagesFetched ? Math.ceil(sorted.length / combinedPagesFetched) : 10) || 10;

  return {
    items: sorted,
    totals: computeTotals(sorted),
    source: {
      url: buildSearchUrl(1, SEARCH_VARIANTS[0].params),
      pagesFetched: combinedPagesFetched,
      maxAvailablePages: combinedMaxPages,
      rowsPerPage: effectiveRows,
      variantSummaries,
    },
    fetchedAt: new Date().toISOString(),
  };
};

const updateDatasetWithCache = async ({ cache, requestedPages }) => {
  const rowsPerPageHint = cache?.source?.rowsPerPage ?? 10;
  const variantCache = cache?.source?.variantSummaries ?? [];
  const combinedNewRows = [];
  const knownIds = new Set((cache?.items ?? []).map((item) => item.id));
  const variantSummaries = [];

  let effectiveRowsPerPage = rowsPerPageHint;
  let totalFetchedPages = 0;
  let totalAvailablePages = 0;

  for (const variant of SEARCH_VARIANTS) {
    const cachedVariant = variantCache.find((v) => v.key === variant.key || v.utgivare === variant.params.Utgivare);
    const storedPages = cachedVariant?.pagesFetched ?? 0;
    const fallbackPages = storedPages || DEFAULT_MAX_PAGES;
    const desiredRaw = requestedPages ?? fallbackPages;
    const desiredPages = Math.min(Math.max(desiredRaw, 1), MAX_REMOTE_PAGES);
    const extendCoverage = desiredPages > storedPages;
    const fetchLimit = extendCoverage ? desiredPages : Math.min(MAX_REMOTE_PAGES, Math.max(2, requestedPages ?? 2));

    const { rows, totalPages, rowsPerPage, pagesFetched } = await fetchPagesWithOptions({
      params: variant.params,
      maxPages: fetchLimit,
      knownIds,
      stopOnKnown: !extendCoverage,
    });

    for (const row of rows) {
      if (!knownIds.has(row.id)) {
        knownIds.add(row.id);
        combinedNewRows.push(row);
      }
    }

    if (!effectiveRowsPerPage && rowsPerPage) effectiveRowsPerPage = rowsPerPage;

    const finalPagesFetched = extendCoverage
      ? Math.min(desiredPages, totalPages)
      : Math.min(Math.max(storedPages, pagesFetched), totalPages);

    variantSummaries.push({
      key: variant.key,
      utgivare: variant.params.Utgivare,
      pagesFetched: finalPagesFetched,
      maxAvailablePages: totalPages,
    });

    totalFetchedPages += finalPagesFetched;
    totalAvailablePages += totalPages;
  }

  const combinedItems = combinedNewRows.length ? sortAndDedupe([...combinedNewRows, ...cache.items]) : cache.items;
  const effectiveRows = effectiveRowsPerPage || rowsPerPageHint || 10;
  const totals = combinedNewRows.length ? computeTotals(combinedItems) : cache.totals;

  const dataset = {
    items: combinedItems,
    totals,
    source: {
      url: buildSearchUrl(1, SEARCH_VARIANTS[0].params),
      pagesFetched: totalFetchedPages,
      maxAvailablePages: totalAvailablePages,
      rowsPerPage: effectiveRows,
      variantSummaries,
    },
    fetchedAt: new Date().toISOString(),
  };

  const dataChanged =
    combinedNewRows.length > 0 ||
    totalFetchedPages !== (cache.source?.pagesFetched ?? 0) ||
    totalAvailablePages !== (cache.source?.maxAvailablePages ?? 0) ||
    effectiveRows !== (cache.source?.rowsPerPage ?? effectiveRows);

  if (dataChanged) {
    await saveInsiderDataset(dataset);
  }

  const pagesReturned = Math.min(requestedPages ?? dataset.source.pagesFetched, dataset.source.pagesFetched);

  return { dataset, pagesReturned };
};

const respondWithDataset = (dataset, pagesToReturn) => {
  const rowsPerPage = dataset.source?.rowsPerPage || 10;
  const items = limitItemsForPages(dataset.items, pagesToReturn, rowsPerPage);
  const body = {
    ...dataset,
    items,
    source: {
      ...dataset.source,
      pagesReturned: pagesToReturn,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pagesParam = Number.parseInt(searchParams.get('pages') || '', 10);
    const forceRefresh = searchParams.get('refresh') === '1';
    const requestedPages = Number.isFinite(pagesParam) && pagesParam > 0 ? Math.min(pagesParam, MAX_REMOTE_PAGES) : null;

    const cache = await loadInsiderDataset();
    const hasCache = cache && Array.isArray(cache.items) && cache.items.length > 0;

    if (!hasCache || forceRefresh) {
      const targetPages = forceRefresh
        ? Math.min(requestedPages ?? cache?.source?.pagesFetched ?? MAX_REMOTE_PAGES, MAX_REMOTE_PAGES)
        : Math.max(requestedPages ?? DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES);
      const dataset = await buildDataset({ maxPages: targetPages });
      await saveInsiderDataset(dataset);
      const pagesReturned = requestedPages ?? Math.min(dataset.source.pagesFetched, targetPages);
      return respondWithDataset(dataset, pagesReturned);
    }

    const { dataset, pagesReturned } = await updateDatasetWithCache({
      cache,
      requestedPages,
    });

    return respondWithDataset(dataset, pagesReturned);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
