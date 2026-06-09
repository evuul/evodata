// Helpers for reading the FI short-selling register for Evolution.

import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";
import { getKvClient } from "./kvClient.js";

export const EVO_LEI = "549300SUH6ZR1RF6TA88";
export const FI_SHORT_REGISTER_URL = "https://www.fi.se/sv/vara-register/blankningsregistret/";
export const FI_SHORT_EMITTENT_URL = (lei) =>
  `https://www.fi.se/sv/vara-register/blankningsregistret/emittent?id=${encodeURIComponent(lei)}`;
export const FI_SHORT_SNAPSHOT_TTL_MS = 3 * 60 * 60 * 1000;

const FI_SHORT_SNAPSHOT_KV_KEY = "short:snapshot:v1";
const FI_SHORT_SNAPSHOT_FILE = path.join(process.cwd(), "src", "app", "data", "shortSnapshot.json");

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

let inFlightSnapshotPromise = null;

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

export function isFreshShortSnapshot(snapshot, now = Date.now()) {
  if (!snapshot?.fetchedAt) return false;
  const fetchedAtMs = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) return false;
  return now - fetchedAtMs < FI_SHORT_SNAPSHOT_TTL_MS;
}

function normalizeShortSnapshot(data) {
  if (!data || typeof data !== "object") return null;

  const totalPercent = Number(data.totalPercent);
  const publicPercent = Number(data.publicPercent);
  const fetchedAt = typeof data.fetchedAt === "string" ? data.fetchedAt : null;
  const observedDate = typeof data.observedDate === "string" ? data.observedDate : null;

  return {
    lei: typeof data.lei === "string" ? data.lei : EVO_LEI,
    totalPercent: Number.isFinite(totalPercent) ? +totalPercent.toFixed(2) : null,
    publicPercent: Number.isFinite(publicPercent) ? +publicPercent.toFixed(2) : null,
    publicPositions: Array.isArray(data.publicPositions) ? data.publicPositions : [],
    observedDate,
    source: typeof data.source === "string" ? data.source : "Finansinspektionen",
    fetchedAt,
  };
}

async function readShortSnapshotFileFallback() {
  try {
    const raw = await fs.readFile(FI_SHORT_SNAPSHOT_FILE, "utf8");
    return normalizeShortSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeShortSnapshotFileFallback(snapshot) {
  try {
    await fs.mkdir(path.dirname(FI_SHORT_SNAPSHOT_FILE), { recursive: true });
    await fs.writeFile(FI_SHORT_SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {}
}

export async function loadShortSnapshot() {
  const kv = await getKvClient();
  if (kv) {
    try {
      const stored = await kv.get(FI_SHORT_SNAPSHOT_KV_KEY);
      if (stored) {
        const normalized =
          typeof stored === "string" ? normalizeShortSnapshot(JSON.parse(stored)) : normalizeShortSnapshot(stored);
        if (normalized) return normalized;
      }
    } catch {}
  }

  return await readShortSnapshotFileFallback();
}

export async function saveShortSnapshot(snapshot) {
  const normalized = normalizeShortSnapshot(snapshot);
  if (!normalized) return null;

  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(FI_SHORT_SNAPSHOT_KV_KEY, JSON.stringify(normalized));
    } catch {}
  }
  await writeShortSnapshotFileFallback(normalized);
  return normalized;
}

export async function resolveFiShortSnapshot({ lei = EVO_LEI, force = false } = {}) {
  const cached = await loadShortSnapshot();
  if (!force && cached && cached.lei === lei && isFreshShortSnapshot(cached)) {
    return { ...cached, cached: true, stale: false };
  }

  if (inFlightSnapshotPromise) {
    return await inFlightSnapshotPromise;
  }

  inFlightSnapshotPromise = (async () => {
    try {
      const fresh = await fetchFiShortRegisterData(lei);
      const snapshot = await saveShortSnapshot({
        ...fresh,
        fetchedAt: new Date().toISOString(),
      });
      if (!snapshot) throw new Error("Could not persist FI short snapshot");
      return { ...snapshot, cached: false, stale: false };
    } catch (error) {
      if (cached && cached.lei === lei) {
        return { ...cached, cached: true, stale: true, error: error instanceof Error ? error.message : String(error) };
      }
      throw error;
    } finally {
      inFlightSnapshotPromise = null;
    }
  })();

  return await inFlightSnapshotPromise;
}
