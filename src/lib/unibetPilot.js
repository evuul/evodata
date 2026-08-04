// Normalizes isolated Unibet pilot samples and summarizes collector reliability.

const MAX_PLAYERS_PER_GAME = 5_000_000;
const DEFAULT_EXPECTED_INTERVAL_MS = 10 * 60 * 1000;

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const slugify = (value) =>
  cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizePlayers = (value) => {
  const raw = String(value ?? "").trim();
  if (!/\d/.test(raw)) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PLAYERS_PER_GAME) return null;
  return Math.round(parsed);
};

export function normalizeUnibetPilotGames(rows) {
  const byId = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = cleanText(row?.name);
    const provider = cleanText(row?.provider);
    const players = normalizePlayers(row?.players);
    if (!name || provider.toLowerCase() !== "evolution" || players == null) continue;

    const href = cleanText(row?.href).split("#")[0];
    const id = slugify(name);
    if (!id) continue;

    const existing = byId.get(id);
    if (!existing || players > existing.players) {
      byId.set(id, { id, name, provider: "Evolution", players, href: href || null });
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
}

export function createUnibetPilotSample({ rows, collectedAt = new Date().toISOString(), sourceUrl }) {
  const games = normalizeUnibetPilotGames(rows);
  if (!games.length) {
    throw new Error("No Evolution games with player counts were found");
  }

  return {
    status: "ok",
    collectedAt,
    source: "unibet-gameshows-browser-pilot",
    sourceUrl,
    gameCount: games.length,
    totalPlayers: games.reduce((sum, game) => sum + game.players, 0),
    games,
  };
}

export function createUnibetPilotFailure(error, collectedAt = new Date().toISOString()) {
  const message = cleanText(error instanceof Error ? error.message : error).slice(0, 240);
  return {
    status: "error",
    collectedAt,
    source: "unibet-gameshows-browser-pilot",
    error: message || "Unknown collector error",
  };
}

export function summarizeUnibetPilotHistory(
  samples,
  { now = Date.now(), expectedIntervalMs = DEFAULT_EXPECTED_INTERVAL_MS } = {}
) {
  const ordered = (Array.isArray(samples) ? samples : [])
    .filter((sample) => sample && Number.isFinite(Date.parse(sample.collectedAt || "")))
    .sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt));
  const successful = ordered.filter((sample) => sample.status === "ok");
  const timestamps = ordered.map((sample) => Date.parse(sample.collectedAt)).sort((a, b) => a - b);
  let largestGapMs = null;
  for (let index = 1; index < timestamps.length; index += 1) {
    const gap = timestamps[index] - timestamps[index - 1];
    largestGapMs = largestGapMs == null ? gap : Math.max(largestGapMs, gap);
  }

  const latest = ordered[0] || null;
  const latestSuccess = successful[0] || null;
  const scheduledWindows = timestamps.length > 1
    ? Math.max(1, Math.round((timestamps.at(-1) - timestamps[0]) / expectedIntervalMs) + 1)
    : ordered.length;

  return {
    runs: ordered.length,
    successfulRuns: successful.length,
    failedRuns: ordered.length - successful.length,
    successRate: ordered.length ? successful.length / ordered.length : null,
    scheduleCoverage: scheduledWindows ? Math.min(1, ordered.length / scheduledWindows) : null,
    largestGapMs,
    expectedIntervalMs,
    latestAgeMs: latest ? Math.max(0, now - Date.parse(latest.collectedAt)) : null,
    latest,
    latestSuccess,
  };
}
