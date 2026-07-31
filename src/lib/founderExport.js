// Validates Founder export requests and converts daily aggregates into safe CSV files.

const MIN_DAYS = 7;
const MAX_DAYS = 365;

export function normalizeFounderExportRequest(searchParams, allowedGameSlugs) {
  const scope = searchParams?.get?.("scope") === "game" ? "game" : "lobby";
  const requestedDays = Number(searchParams?.get?.("days"));
  const days = Number.isFinite(requestedDays)
    ? Math.max(MIN_DAYS, Math.min(Math.floor(requestedDays), MAX_DAYS))
    : 30;
  const game = String(searchParams?.get?.("game") || "").trim();

  if (scope === "game" && !allowedGameSlugs?.has?.(game)) {
    return { ok: false, error: "Unknown game" };
  }
  return { ok: true, scope, days, game: scope === "game" ? game : null };
}

const completedDailyRows = (dateMap, todayYmd) =>
  Array.from(dateMap?.entries?.() || [])
    .map(([date, entry]) => {
      const sum = Number(entry?.sum);
      const count = Number(entry?.count);
      if (!date || date >= todayYmd || !Number.isFinite(sum) || !(count > 0)) return null;
      return { date, averagePlayers: Math.round((sum / count) * 100) / 100 };
    })
    .filter(Boolean)
    .sort((left, right) => left.date.localeCompare(right.date));

export function buildFounderExportRows({ aggregates, slugs, scope, game, days, todayYmd }) {
  if (!(aggregates instanceof Map) || !Array.isArray(slugs)) return [];

  if (scope === "game") {
    return completedDailyRows(aggregates.get(game), todayYmd)
      .slice(-days)
      .map((row) => ({ ...row, game }));
  }

  const totals = new Map();
  for (const slug of slugs) {
    for (const row of completedDailyRows(aggregates.get(slug), todayYmd)) {
      totals.set(row.date, (totals.get(row.date) || 0) + row.averagePlayers);
    }
  }
  return Array.from(totals.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-days)
    .map(([date, averagePlayers]) => ({
      date,
      averagePlayers: Math.round(averagePlayers * 100) / 100,
    }));
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function serializeFounderCsv(rows, { scope }) {
  const isGame = scope === "game";
  const header = isGame ? ["date", "game", "average_players"] : ["date", "average_players"];
  const body = rows.map((row) =>
    (isGame
      ? [row.date, row.game, row.averagePlayers]
      : [row.date, row.averagePlayers]
    ).map(csvCell).join(",")
  );
  return [header.join(","), ...body].join("\r\n");
}
