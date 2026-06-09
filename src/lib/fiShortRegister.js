// Helpers for reading the FI short-selling register for Evolution.

import * as cheerio from "cheerio";

export const EVO_LEI = "549300SUH6ZR1RF6TA88";
export const FI_SHORT_REGISTER_URL = "https://www.fi.se/sv/vara-register/blankningsregistret/";
export const FI_SHORT_EMITTENT_URL = (lei) =>
  `https://www.fi.se/sv/vara-register/blankningsregistret/emittent?id=${encodeURIComponent(lei)}`;

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

export function stockholmYmd(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "00";
    const day = parts.find((part) => part.type === "day")?.value ?? "00";
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function parseFiPercent(value) {
  if (value == null) return null;
  const text = normalizeWhitespace(value).replace(/%/g, "");
  if (!text) return null;
  if (/^<\s*0[,\.]5$/i.test(text)) return null;
  const numeric = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? +numeric.toFixed(2) : null;
}

function parseDate(value) {
  const text = normalizeWhitespace(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function getTableHeaders($, table) {
  const headerRow = table.find("thead tr").first().length ? table.find("thead tr").first() : table.find("tr").first();
  return headerRow
    .find("th,td")
    .toArray()
    .map((cell) => normalizeWhitespace($(cell).text()).toLowerCase());
}

export function parseCurrentPositions(html) {
  const $ = cheerio.load(html);
  const tables = $("table").toArray();

  for (const tableEl of tables) {
    const table = $(tableEl);
    const headers = getTableHeaders($, table);
    const isCurrentPositionsTable =
      headers.some((header) => header.includes("positionsinnehavare")) &&
      headers.some((header) => header.includes("position i procent")) &&
      headers.some((header) => header.includes("positionsdatum")) &&
      !headers.some((header) => header.includes("efterföljande position"));

    if (!isCurrentPositionsTable) continue;

    const rows = table.find("tbody tr").toArray();
    if (!rows.length) return [];

    return rows
      .map((rowEl) => {
        const cells = $(rowEl)
          .find("td")
          .toArray()
          .map((cell) => normalizeWhitespace($(cell).text()));
        if (cells.length < 5) return null;

        const [holder, isin, positionRaw, dateRaw, previousRaw] = cells;
        const positionPercent = parseFiPercent(positionRaw);
        const previousPositionPercent = parseFiPercent(previousRaw);

        return {
          holder,
          isin,
          positionPercent,
          positionPercentRaw: normalizeWhitespace(positionRaw),
          positionsDate: parseDate(dateRaw),
          previousPositionPercent,
          previousPositionPercentRaw: normalizeWhitespace(previousRaw),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateCompare = (b.positionsDate ?? "").localeCompare(a.positionsDate ?? "");
        if (dateCompare !== 0) return dateCompare;
        const percentA = Number.isFinite(a.positionPercent) ? a.positionPercent : -Infinity;
        const percentB = Number.isFinite(b.positionPercent) ? b.positionPercent : -Infinity;
        if (percentB !== percentA) return percentB - percentA;
        return a.holder.localeCompare(b.holder, "sv");
      });
  }

  return [];
}

function extractTotalPercentFromText(text) {
  const match = /Summa procent\s+([0-9]+(?:[.,][0-9]+)?)/i.exec(normalizeWhitespace(text));
  return match ? parseFiPercent(match[1]) : null;
}

export function extractTotalPercentFromEmittentHtml(html) {
  return extractTotalPercentFromText(cheerio.load(html).text());
}

export function extractTotalPercentFromListHtml(html, lei) {
  const $ = cheerio.load(html);
  const row = $("tr").toArray().find((rowEl) => normalizeWhitespace($(rowEl).text()).includes(lei));
  if (!row) return null;
  const numericCell = $(row).find("td.numeric").first();
  if (numericCell.length) {
    return parseFiPercent(numericCell.text());
  }
  return extractTotalPercentFromText($(row).text());
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EvoTrackerBot/1.0)",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      Referer: FI_SHORT_REGISTER_URL,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

export async function fetchFiShortRegisterData(lei = EVO_LEI) {
  const emittentUrl = FI_SHORT_EMITTENT_URL(lei);
  const emittentHtml = await fetchText(emittentUrl);

  let totalPercent = extractTotalPercentFromEmittentHtml(emittentHtml);
  if (totalPercent == null) {
    const listHtml = await fetchText(FI_SHORT_REGISTER_URL);
    totalPercent = extractTotalPercentFromListHtml(listHtml, lei);
  }

  const publicPositions = parseCurrentPositions(emittentHtml);
  const publicPercent = publicPositions.reduce(
    (sum, position) => sum + (Number.isFinite(position.positionPercent) ? position.positionPercent : 0),
    0
  );

  return {
    lei,
    totalPercent,
    publicPercent: +publicPercent.toFixed(2),
    publicPositions,
    observedDate: stockholmYmd(),
    source: "Finansinspektionen",
  };
}
