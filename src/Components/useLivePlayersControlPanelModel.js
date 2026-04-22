"use client";

// Data and state model for the live players control panel.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { useAuth } from "@/context/AuthContext";
import { GAMES as GAME_CONFIG, COLORS as GAME_COLORS } from "@/config/games";
import { fetchOverviewSharedWithOptions } from "@/lib/csOverviewClient";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import {
  getStockholmTodayYmd,
  formatDateTime,
  formatDateOnly,
  normalizeDailySeries,
  normalizeTrendDelta,
  normalizeTodayPeak,
  normalizeLobbyAth,
  computeTrendDiff,
  applyMovingAverage,
  dateFormatter,
  timeFormatter,
} from "@/lib/livePlayersControlPanel";

const TREND_BOOST_STORAGE_KEY = "trend_boost_10pct";
const LOBBY_BOOST_STORAGE_KEY = "lobby_boost_10pct";
const ATH_FORCE_REFRESH_STORAGE_KEY = "ath_force_refresh_last_at";
const ATH_FORCE_REFRESH_MS = 3 * 60 * 60 * 1000;

const TREND_DAY_OPTIONS = [30, 60, 90, 180];
const MA_WINDOW_OPTIONS = [7, 14, 30];
const TOP_GROWTH_DAYS = 90;
const ATH_DAY_OPTIONS = [90, 180, 365];
const INITIAL_VISIBLE_LIVE = 10;
const INITIAL_VISIBLE_ATH = 10;
const ASIA_GAME_KEYS = [
  "bac-bo",
  "lightning-bac-bo",
  "lightning-baccarat",
  "super-sic-bo",
  "fan-tan-live",
  "super-andar-bahar",
  "speed-baccarat-a",
  "lightning-dice",
];
const ASIA_GAME_KEY_SET = new Set(ASIA_GAME_KEYS);
const ASIA_AGG_COLOR = "#fde047";
const SHOW_YESTERDAY_PEAK_CARD = false;
const LOCAL_HOURLY_COMPARE_ENABLED = process.env.NEXT_PUBLIC_LOCAL_HOURLY_COMPARE === "1";

class PersistentCache {
  constructor(prefix = "cache_v1_") {
    this.prefix = prefix;
  }
  _key(key) {
    return `${this.prefix}${key}`;
  }
  get(key) {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(this._key(key));
      if (!raw) return null;
      const { value, exp } = JSON.parse(raw);
      if (exp && Date.now() > exp) {
        localStorage.removeItem(this._key(key));
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  set(key, value, ttlMs) {
    if (typeof window === "undefined") return;
    try {
      const exp = ttlMs ? Date.now() + ttlMs : undefined;
      localStorage.setItem(this._key(key), JSON.stringify({ value, exp }));
    } catch {
      // ignore quota errors
    }
  }
  cleanup() {
    if (typeof window === "undefined") return;
    try {
      const now = Date.now();
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) keys.push(k);
      }
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        try {
          const { exp } = JSON.parse(raw);
          if (exp && now > exp) localStorage.removeItem(k);
        } catch {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore cleanup failures
    }
  }
}

const overviewCache = new PersistentCache("overview_");
const OVERVIEW_TTL = 2 * 60 * 1000;

const SLUG_TO_GAME = (() => {
  const map = new Map();
  (GAME_CONFIG || []).forEach((game) => {
    if (game?.slug) map.set(game.slug, game);
    if (game?.id) map.set(game.id, game);
  });
  return map;
})();

const shouldRunAthForceRefresh = () => {
  if (typeof window === "undefined") return false;
  try {
    const raw = Number(window.localStorage.getItem(ATH_FORCE_REFRESH_STORAGE_KEY));
    if (!Number.isFinite(raw) || raw <= 0) return true;
    return Date.now() - raw >= ATH_FORCE_REFRESH_MS;
  } catch {
    return true;
  }
};

const markAthForceRefreshNow = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ATH_FORCE_REFRESH_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore quota/access issues
  }
};

export default function useLivePlayersControlPanelModel() {
  const {
    data: liveGames,
    loading: loadingLive,
    GAMES: contextGames,
    lastUpdated,
    lobbyStats,
  } = usePlayersLive();
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdminView = Boolean(user?.isAdmin);
  const translate = useTranslate();

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "en" ? "en-US" : "sv-SE", {
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "en" ? "en-US" : "sv-SE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const [detailView, setDetailView] = useState("trend");
  const [trendDays, setTrendDays] = useState(TREND_DAY_OPTIONS[0]);
  const [athDays, setAthDays] = useState(ATH_DAY_OPTIONS[1]);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [dailyTotals, setDailyTotals] = useState([]);
  const [slugAverages, setSlugAverages] = useState([]);
  const [slugDetails, setSlugDetails] = useState([]);
  const [slugDailyMap, setSlugDailyMap] = useState(new Map());
  const [trendDelta, setTrendDelta] = useState(null);
  const [todayPeak, setTodayPeak] = useState(null);
  const [yesterdayPeak, setYesterdayPeak] = useState(null);
  const [lobbyAth, setLobbyAth] = useState(null);
  const [gameTrendSlug, setGameTrendSlug] = useState(null);
  const [gameTrendDays, setGameTrendDays] = useState(TREND_DAY_OPTIONS[0]);
  const [asiaTrackerSlug, setAsiaTrackerSlug] = useState(null);
  const [asiaTrackerDays, setAsiaTrackerDays] = useState(TREND_DAY_OPTIONS[0]);
  const [asiaViewMode, setAsiaViewMode] = useState("trend");
  const [asiaTrendMaOn, setAsiaTrendMaOn] = useState(false);
  const [overviewGeneratedAt, setOverviewGeneratedAt] = useState(null);
  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllAth, setShowAllAth] = useState(false);
  const [trendBoostOn, setTrendBoostOn] = useState(false);
  const [lobbyBoostOn, setLobbyBoostOn] = useState(false);
  const [trendMaOn, setTrendMaOn] = useState(false);
  const [gameTrendMaOn, setGameTrendMaOn] = useState(true);
  const [trendMaWindowDays, setTrendMaWindowDays] = useState(30);
  const [gameTrendMaWindowDays, setGameTrendMaWindowDays] = useState(30);
  const [asiaTrendMaWindowDays, setAsiaTrendMaWindowDays] = useState(30);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem(TREND_BOOST_STORAGE_KEY);
      setTrendBoostOn(v === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem(LOBBY_BOOST_STORAGE_KEY);
      setLobbyBoostOn(v === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(TREND_BOOST_STORAGE_KEY, trendBoostOn ? "1" : "0");
    } catch {}
  }, [trendBoostOn]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOBBY_BOOST_STORAGE_KEY, lobbyBoostOn ? "1" : "0");
    } catch {}
  }, [lobbyBoostOn]);

  const fetchOverview = useCallback(async (range, options = {}) => {
    const force = Boolean(options?.force);
    const cacheKey = `days_${range}${force ? "_force" : ""}`;
    const cached = force ? null : overviewCache.get(cacheKey);
    if (cached) {
      setOverviewError("");
      setDailyTotals(cached.dailyTotals);
      setSlugAverages(cached.slugAverages);
      setSlugDetails(cached.slugDetails);
      const cachedDailyEntries = Array.isArray(cached.slugDailyEntries) ? cached.slugDailyEntries : [];
      const map = new Map(cachedDailyEntries.map(([slug, arr]) => [slug, normalizeDailySeries(arr)]));
      setSlugDailyMap(map);
      setTrendDelta(normalizeTrendDelta(cached.trendDelta));
      setTodayPeak(normalizeTodayPeak(cached.todayPeak));
      setYesterdayPeak(normalizeTodayPeak(cached.yesterdayPeak));
      setLobbyAth(normalizeLobbyAth(cached.lobbyAth));
      setGameTrendSlug((prev) => {
        if (prev && map.has(prev)) return prev;
        const first = map.keys().next();
        return first.done ? prev : first.value;
      });
      setOverviewGeneratedAt(cached.generatedAt);
      return;
    }

    setOverviewLoading(true);
    setOverviewError("");
    try {
      const json = await fetchOverviewSharedWithOptions(range, { force });

      const totals = Array.isArray(json?.dailyTotals)
        ? json.dailyTotals
            .map((row) => ({ date: row?.date, avgPlayers: Number(row?.avgPlayers) }))
            .filter((row) => row?.date && Number.isFinite(row?.avgPlayers))
        : [];

      const averages = Array.isArray(json?.slugAverages)
        ? json.slugAverages
            .map((item) => ({ slug: item?.slug, avgPlayers: Number(item?.avgPlayers) }))
            .filter((item) => typeof item.slug === "string" && Number.isFinite(item.avgPlayers))
        : [];

      const details = Array.isArray(json?.slugDetails)
        ? json.slugDetails
            .map((item) => {
              if (!item || typeof item.slug !== "string") return null;
              const latestValue = Number(item?.latest?.value);
              const athValue = Number(item?.ath?.value);
              return {
                slug: item.slug,
                latest:
                  Number.isFinite(latestValue) && item?.latest?.at
                    ? { value: Math.round(latestValue), at: item.latest.at }
                    : Number.isFinite(latestValue)
                    ? { value: Math.round(latestValue), at: null }
                    : null,
                ath:
                  Number.isFinite(athValue) && item?.ath?.at
                    ? { value: Math.round(athValue), at: item.ath.at }
                    : Number.isFinite(athValue)
                    ? { value: Math.round(athValue), at: null }
                    : null,
              };
            })
            .filter(Boolean)
        : [];

      const slugDailyEntries = Object.entries(json?.slugDaily ?? {}).map(([slug, series]) => [
        slug,
        normalizeDailySeries(series),
      ]);
      const trendInfo = normalizeTrendDelta(json?.trendDelta);
      const todaysPeak = normalizeTodayPeak(json?.todayPeak);
      const yesterdaysPeak = normalizeTodayPeak(json?.yesterdayPeak);
      const overviewAth = normalizeLobbyAth(json?.ath);

      const payload = {
        dailyTotals: totals,
        slugAverages: averages,
        slugDetails: details,
        slugDailyEntries,
        trendDelta: trendInfo,
        todayPeak: todaysPeak,
        yesterdayPeak: yesterdaysPeak,
        lobbyAth: overviewAth,
        generatedAt: json?.generatedAt || null,
      };
      if (!force) {
        overviewCache.set(cacheKey, payload, OVERVIEW_TTL);
      }

      setDailyTotals(totals);
      setSlugAverages(averages);
      setSlugDetails(details);
      const map = new Map(slugDailyEntries);
      setSlugDailyMap(map);
      setTrendDelta(trendInfo);
      setTodayPeak(todaysPeak);
      setYesterdayPeak(yesterdaysPeak);
      setLobbyAth(overviewAth);
      setGameTrendSlug((prev) => {
        if (prev && map.has(prev)) return prev;
        const first = map.keys().next();
        return first.done ? prev : first.value;
      });
      setOverviewGeneratedAt(payload.generatedAt);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : String(error));
      setDailyTotals([]);
      setSlugAverages([]);
      setSlugDetails([]);
      setSlugDailyMap(new Map());
      setTrendDelta(null);
      setTodayPeak(null);
      setYesterdayPeak(null);
      setLobbyAth(null);
      setOverviewGeneratedAt(null);
    } finally {
      setOverviewLoading(false);
      overviewCache.cleanup();
    }
  }, []);

  useEffect(() => {
    const range = Math.max(trendDays, athDays, gameTrendDays, asiaTrackerDays);
    fetchOverview(range);
  }, [trendDays, athDays, gameTrendDays, asiaTrackerDays, fetchOverview]);

  useEffect(() => {
    if (detailView !== "ath") return;
    if (!shouldRunAthForceRefresh()) return;
    const range = Math.max(trendDays, athDays, gameTrendDays, asiaTrackerDays);
    fetchOverview(range, { force: true }).then(() => {
      markAthForceRefreshNow();
    });
  }, [detailView, trendDays, athDays, gameTrendDays, asiaTrackerDays, fetchOverview]);

  useEffect(() => {
    if (!slugDailyMap.size) {
      setGameTrendSlug((prev) => (prev !== null ? null : prev));
      return;
    }
    setGameTrendSlug((prev) => {
      if (prev && slugDailyMap.has(prev)) return prev;
      const first = slugDailyMap.keys().next();
      return first.done ? prev : first.value;
    });
  }, [slugDailyMap]);

  const rawTodayPeak = lobbyStats?.todayPeak ?? todayPeak;
  const mergedYesterdayPeak = lobbyStats?.yesterdayPeak ?? yesterdayPeak;
  const mergedLobbyAth = lobbyStats?.lobbyAth ?? lobbyAth;
  const stockholmTodayYmd = getStockholmTodayYmd();

  const stabilizedTodayPeak = useMemo(() => {
    const athValue = Number(mergedLobbyAth?.value);
    const todayValue = Number(rawTodayPeak?.value);
    const athDate = mergedLobbyAth?.date ?? (mergedLobbyAth?.at ? mergedLobbyAth.at.slice(0, 10) : null);
    const athIsToday = athDate && athDate === stockholmTodayYmd;
    if (athIsToday && Number.isFinite(athValue) && (!Number.isFinite(todayValue) || athValue > todayValue)) {
      return {
        value: athValue,
        at: mergedLobbyAth?.at ?? rawTodayPeak?.at ?? null,
        date: athDate ?? rawTodayPeak?.date ?? null,
      };
    }
    return rawTodayPeak;
  }, [rawTodayPeak, mergedLobbyAth, stockholmTodayYmd]);

  const playersUpdatedText = useMemo(() => {
    if (!lastUpdated) return translate("Uppdatering saknas", "No update available");
    const dateStr = formatDateTime(lastUpdated);
    return dateStr
      ? translate(`Senast ${dateStr}`, `Last updated ${dateStr}`)
      : translate("Uppdatering saknas", "No update available");
  }, [lastUpdated, translate]);

  const todayPeakTimeInfo = useMemo(() => {
    if (!stabilizedTodayPeak?.at) return null;
    try {
      const date = new Date(stabilizedTodayPeak.at);
      if (!Number.isFinite(date.getTime())) return null;
      return {
        time: timeFormatter.format(date),
        date: dateFormatter.format(date),
        full: formatDateTime(date),
      };
    } catch {
      return null;
    }
  }, [stabilizedTodayPeak]);

  const liveGamesList = useMemo(() => {
    const sourceGames = contextGames ?? GAME_CONFIG ?? [];
    const rows = sourceGames.map((g) => {
      const entry = liveGames?.[g.id] || {};
      const players = typeof entry.players === "number" ? entry.players : null;
      return {
        id: g.id,
        label: g.label,
        players,
        updated: entry.updated || null,
        color: GAME_COLORS?.[g.id] || "#38bdf8",
      };
    });
    rows.sort((a, b) => {
      const av = a.players;
      const bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return rows;
  }, [contextGames, liveGames]);

  const visibleLiveGames = useMemo(() => {
    if (showAllLive) return liveGamesList;
    return liveGamesList.slice(0, INITIAL_VISIBLE_LIVE);
  }, [liveGamesList, showAllLive]);

  const totalLivePlayers = useMemo(() => {
    const total = liveGamesList.reduce((sum, row) => {
      if (Number.isFinite(row.players)) return sum + row.players;
      return sum;
    }, 0);
    return total > 0 ? total : null;
  }, [liveGamesList]);

  const lobbyBoostMultiplier = lobbyBoostOn ? 1.1 : 1;

  const totalLiveDisplayValue = useMemo(() => {
    if (!Number.isFinite(totalLivePlayers)) return null;
    return Math.round(totalLivePlayers * lobbyBoostMultiplier);
  }, [totalLivePlayers, lobbyBoostMultiplier]);

  const hourlyComparisonMeta = useMemo(() => {
    if (!isAdminView && !LOCAL_HOURLY_COMPARE_ENABLED) return null;
    const cmp = lobbyStats?.hourlyComparison;
    if (!cmp) return null;
    const baseline = cmp?.baselineAvg;
    const samples = cmp?.samples;
    const hour = String(cmp?.hour || "").trim();
    const currentLive = Number.isFinite(totalLiveDisplayValue) ? Number(totalLiveDisplayValue) : Number(cmp?.currentTotal);
    const delta =
      Number.isFinite(currentLive) && Number.isFinite(baseline) && baseline > 0
        ? ((currentLive - baseline) / baseline) * 100
        : Number(cmp?.deltaPct);
    if (!Number.isFinite(delta) || !Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(samples) || samples <= 0 || !hour) {
      return null;
    }
    const sign = delta > 0 ? "+" : "";
    const baselineLabel = numberFormatter.format(Math.round(baseline));
    const text = translate(
      `${hour}:00 vs 60d-snitt: ${sign}${percentFormatter.format(delta)}% (bas ${baselineLabel})`,
      `${hour}:00 vs 60d avg: ${sign}${percentFormatter.format(delta)}% (base ${baselineLabel})`
    );
    const color = delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "rgba(148,163,184,0.75)";
    return { text, color };
  }, [isAdminView, lobbyStats?.hourlyComparison, numberFormatter, percentFormatter, totalLiveDisplayValue, translate]);

  const hourlyByHourRows = useMemo(() => {
    if (!LOCAL_HOURLY_COMPARE_ENABLED) return [];
    const rows = Array.isArray(lobbyStats?.hourlyByHour) ? lobbyStats.hourlyByHour : [];
    return rows
      .map((row) => {
        const hour = String(row?.hour || "").trim();
        const baseline = Number(row?.baselineAvg);
        const currentTotalFromRow = Number(row?.currentTotal);
        const currentTotal =
          Boolean(row?.isCurrentHour) && Number.isFinite(totalLiveDisplayValue)
            ? Number(totalLiveDisplayValue)
            : currentTotalFromRow;
        const delta = Number(row?.deltaPct);
        const samples = Number(row?.samples);
        if (!hour || !Number.isFinite(baseline) || baseline <= 0) return null;
        const resolvedDelta =
          Number.isFinite(currentTotal) && baseline > 0
            ? ((currentTotal - baseline) / baseline) * 100
            : Number.isFinite(delta)
            ? delta
            : null;
        return {
          hour,
          baseline: Math.round(baseline),
          currentTotal: Number.isFinite(currentTotal) && currentTotal > 0 ? Math.round(currentTotal) : null,
          delta: Number.isFinite(resolvedDelta) ? resolvedDelta : null,
          samples: Number.isFinite(samples) && samples > 0 ? Math.round(samples) : 0,
          isCurrentHour: Boolean(row?.isCurrentHour),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [lobbyStats?.hourlyByHour, totalLiveDisplayValue]);

  const todayPeakDisplayValue = useMemo(() => {
    const peakValue = Number.isFinite(stabilizedTodayPeak?.value) ? stabilizedTodayPeak.value : null;
    if (peakValue == null) return null;
    return Math.round(peakValue * lobbyBoostMultiplier);
  }, [stabilizedTodayPeak, lobbyBoostMultiplier]);

  const todayPeakMetaText = useMemo(() => {
    if (!stabilizedTodayPeak) return translate("Ingen peak registrerad", "No peak recorded");
    return todayPeakTimeInfo?.full
      ? translate(`Peak ${todayPeakTimeInfo.full}`, `Peak ${todayPeakTimeInfo.full}`)
      : translate("Ingen tidsstämpel registrerad", "No timestamp available");
  }, [stabilizedTodayPeak, todayPeakTimeInfo, translate]);

  const baseLobbyAth = useMemo(() => {
    const candidates = [];
    if (Number.isFinite(mergedLobbyAth?.value)) {
      candidates.push({ value: mergedLobbyAth.value, date: mergedLobbyAth?.date ?? null, type: "historical" });
    }
    if (Number.isFinite(stabilizedTodayPeak?.value)) {
      candidates.push({
        value: stabilizedTodayPeak.value,
        date: stabilizedTodayPeak?.at ?? stabilizedTodayPeak?.date ?? null,
        type: "today",
      });
    }
    if (!candidates.length) return null;
    return candidates.reduce((max, curr) => {
      if (!max || curr.value > max.value) return curr;
      return max;
    }, null);
  }, [mergedLobbyAth, stabilizedTodayPeak]);

  const lobbyAthDisplay = useMemo(() => {
    if (!baseLobbyAth) return null;
    const isToday = baseLobbyAth.type === "today";
    const date = baseLobbyAth.date ?? null;
    const dateLabel = isToday ? todayPeakTimeInfo?.full || "Idag" : date ? formatDateOnly(date) : null;
    return {
      value: Math.round(baseLobbyAth.value * lobbyBoostMultiplier),
      date,
      dateLabel,
      isToday,
    };
  }, [baseLobbyAth, lobbyBoostMultiplier, todayPeakTimeInfo]);

  const yesterdayPeakDisplayValue = useMemo(() => {
    if (!Number.isFinite(mergedYesterdayPeak?.value)) return null;
    return Math.round(mergedYesterdayPeak.value * lobbyBoostMultiplier);
  }, [mergedYesterdayPeak, lobbyBoostMultiplier]);

  const yesterdayPeakMetaText = useMemo(() => {
    if (!mergedYesterdayPeak) return translate("Ingen peak registrerad", "No peak recorded");
    if (mergedYesterdayPeak.at) {
      const formatted = formatDateTime(mergedYesterdayPeak.at);
      return formatted
        ? translate(`Peak ${formatted}`, `Peak ${formatted}`)
        : translate("Ingen tidsstämpel registrerad", "No timestamp available");
    }
    if (mergedYesterdayPeak.date) {
      const formattedDate = formatDateOnly(mergedYesterdayPeak.date);
      return formattedDate
        ? translate(`Uppnåddes ${formattedDate}`, `Reached ${formattedDate}`)
        : translate("Ingen tidsstämpel registrerad", "No timestamp available");
    }
    return translate("Ingen tidsstämpel registrerad", "No timestamp available");
  }, [mergedYesterdayPeak, translate]);

  const trendChartData = useMemo(() => {
    if (!dailyTotals.length) return [];
    const sliceCount = Math.min(dailyTotals.length, Math.max(trendDays, 1));
    return dailyTotals
      .slice(-sliceCount)
      .map((row) => ({
        date: row.date,
        players: Number.isFinite(row.avgPlayers) ? Math.round(row.avgPlayers) : null,
      }))
      .filter((row) => row.players != null);
  }, [dailyTotals, trendDays]);

  const trendSeriesForView = useMemo(
    () => (trendMaOn ? applyMovingAverage(trendChartData, trendMaWindowDays) : trendChartData),
    [trendChartData, trendMaOn, trendMaWindowDays]
  );

  const boostedTrendChartData = useMemo(
    () =>
      trendBoostOn
        ? trendSeriesForView.map((row) => ({
            ...row,
            players: Math.round(row.players * 1.1),
          }))
        : trendSeriesForView,
    [trendSeriesForView, trendBoostOn]
  );

  const boostedTrendSummary = useMemo(() => computeTrendDiff(boostedTrendChartData), [boostedTrendChartData]);
  const trendSummaryForView = boostedTrendSummary ?? trendDelta;
  const trendUpdatedLabel = useMemo(() => formatDateTime(overviewGeneratedAt), [overviewGeneratedAt]);
  const toggleLobbyBoost = useCallback(() => setLobbyBoostOn((prev) => !prev), []);

  const rankingRows = useMemo(
    () =>
      slugAverages
        .map((item) => {
          const game = SLUG_TO_GAME.get(item.slug);
          return {
            slug: item.slug,
            label: game?.label || item.slug,
            avgPlayers: item.avgPlayers,
            color: GAME_COLORS?.[game?.id] || "#38bdf8",
          };
        })
        .sort((a, b) => b.avgPlayers - a.avgPlayers),
    [slugAverages]
  );

  const athRows = useMemo(
    () =>
      slugDetails
        .map((detail) => {
          const game = SLUG_TO_GAME.get(detail.slug);
          return {
            slug: detail.slug,
            label: game?.label || detail.slug,
            color: GAME_COLORS?.[game?.id] || "#f8fafc",
            ath: detail.ath || null,
            latest: detail.latest || null,
          };
        })
        .filter((item) => item.ath != null || item.latest != null)
        .sort((a, b) => (b.ath?.value ?? -Infinity) - (a.ath?.value ?? -Infinity)),
    [slugDetails]
  );

  const topGrowthUseMa = trendMaOn || gameTrendMaOn;

  const topGrowthGame = useMemo(() => {
    if (!slugDailyMap.size) return null;
    const candidates = [];
    slugDailyMap.forEach((series, slug) => {
      if (!Array.isArray(series) || series.length < 2) return;
      const baseSeries = topGrowthUseMa ? applyMovingAverage(series, TOP_GROWTH_DAYS) : series;
      const slice = baseSeries.slice(-TOP_GROWTH_DAYS);
      if (slice.length < 2) return;
      const trend = computeTrendDiff(slice);
      if (!trend || !Number.isFinite(trend.percent)) return;
      const game = SLUG_TO_GAME.get(slug);
      const color = GAME_COLORS?.[game?.id] || "#34d399";
      candidates.push({
        slug,
        label: game?.label || slug,
        percent: trend.percent,
        start: trend.start,
        end: trend.end,
        color,
      });
    });
    if (!candidates.length) return null;
    const positive = candidates.filter((item) => item.percent > 0);
    const pool = positive.length ? positive : candidates;
    pool.sort((a, b) => b.percent - a.percent);
    return { ...pool[0], hasPositive: positive.length > 0 };
  }, [slugDailyMap, topGrowthUseMa]);

  const topGrowthDisplay = useMemo(() => {
    if (!topGrowthGame) return null;
    const percentText = Number.isFinite(topGrowthGame.percent)
      ? `${topGrowthGame.percent > 0 ? "+" : ""}${percentFormatter.format(topGrowthGame.percent)}%`
      : "—";
    const startDateText = formatDateOnly(topGrowthGame.start?.date);
    const endDateText = formatDateOnly(topGrowthGame.end?.date);
    const rangeText = startDateText && endDateText ? `${startDateText} → ${endDateText}` : null;
    return { ...topGrowthGame, percentText, rangeText };
  }, [topGrowthGame, percentFormatter]);

  const gameTrendOptions = useMemo(() => {
    if (!slugDailyMap.size) return [];
    return Array.from(slugDailyMap.entries())
      .map(([slug, series]) => {
        const game = SLUG_TO_GAME.get(slug);
        const label = game?.label || slug;
        const color = GAME_COLORS?.[game?.id] || "#38bdf8";
        const latest = series.length ? series[series.length - 1].players : null;
        const average =
          series.length > 0
            ? Math.round(series.reduce((sum, row) => sum + (row.players ?? 0), 0) / series.length)
            : null;
        return { slug, label, color, latest, average };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));
  }, [slugDailyMap]);

  const selectedGameOption = useMemo(
    () => gameTrendOptions.find((opt) => opt.slug === gameTrendSlug) || null,
    [gameTrendOptions, gameTrendSlug]
  );

  const asiaTrendOptions = useMemo(
    () => gameTrendOptions.filter((opt) => ASIA_GAME_KEY_SET.has(opt.slug)),
    [gameTrendOptions]
  );

  const asiaCombinedSeries = useMemo(() => {
    if (!slugDailyMap.size) return [];
    const totals = new Map();
    let hasData = false;
    ASIA_GAME_KEYS.forEach((slug) => {
      const series = slugDailyMap.get(slug);
      if (!Array.isArray(series) || !series.length) return;
      series.forEach((row) => {
        const date = row?.date;
        const players = Number(row?.players);
        if (!date || !Number.isFinite(players)) return;
        hasData = true;
        totals.set(date, (totals.get(date) ?? 0) + players);
      });
    });
    if (!hasData) return [];
    return Array.from(totals.entries())
      .map(([date, players]) => ({ date, players: Math.round(players) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [slugDailyMap]);

  const asiaTrendChartData = useMemo(() => {
    if (!asiaCombinedSeries.length) return [];
    const sliceCount = Math.min(asiaCombinedSeries.length, Math.max(asiaTrackerDays, 1));
    return asiaCombinedSeries.slice(-sliceCount);
  }, [asiaCombinedSeries, asiaTrackerDays]);

  const asiaTrendChartDataForView = useMemo(
    () => (asiaTrendMaOn ? applyMovingAverage(asiaTrendChartData, asiaTrendMaWindowDays) : asiaTrendChartData),
    [asiaTrendChartData, asiaTrendMaWindowDays, asiaTrendMaOn]
  );

  const asiaTrendSummary = useMemo(() => computeTrendDiff(asiaTrendChartDataForView), [asiaTrendChartDataForView]);

  useEffect(() => {
    if (!asiaTrendOptions.length) {
      setAsiaTrackerSlug((prev) => (prev !== null ? null : prev));
      return;
    }
    setAsiaTrackerSlug((prev) => {
      if (prev && asiaTrendOptions.some((opt) => opt.slug === prev)) return prev;
      return asiaTrendOptions[0].slug;
    });
  }, [asiaTrendOptions]);

  useEffect(() => {
    if (asiaViewMode === "trend" && !asiaCombinedSeries.length && asiaTrendOptions.length > 0) {
      setAsiaViewMode("games");
    }
  }, [asiaViewMode, asiaCombinedSeries.length, asiaTrendOptions.length]);

  const gameTrendSeries = useMemo(() => {
    if (!gameTrendSlug || !slugDailyMap.size) return [];
    const series = slugDailyMap.get(gameTrendSlug) ?? [];
    const sliceCount = Math.min(series.length, Math.max(gameTrendDays, 1));
    return series.slice(-sliceCount);
  }, [slugDailyMap, gameTrendSlug, gameTrendDays]);

  const gameTrendChartData = useMemo(
    () => (gameTrendMaOn ? applyMovingAverage(gameTrendSeries, gameTrendMaWindowDays) : gameTrendSeries),
    [gameTrendSeries, gameTrendMaOn, gameTrendMaWindowDays]
  );

  const gameTrendSummary = useMemo(() => {
    const primary = computeTrendDiff(gameTrendChartData);
    if (primary) return primary;
    if (!gameTrendSlug) return null;
    const fullSeries = slugDailyMap.get(gameTrendSlug) ?? [];
    return computeTrendDiff(fullSeries);
  }, [gameTrendChartData, gameTrendSlug, slugDailyMap]);

  const selectedAsiaOption = useMemo(
    () => asiaTrendOptions.find((opt) => opt.slug === asiaTrackerSlug) || null,
    [asiaTrendOptions, asiaTrackerSlug]
  );

  const asiaTrackerSeries = useMemo(() => {
    if (!asiaTrackerSlug || !slugDailyMap.size) return [];
    const series = slugDailyMap.get(asiaTrackerSlug) ?? [];
    const sliceCount = Math.min(series.length, Math.max(asiaTrackerDays, 1));
    return series.slice(-sliceCount);
  }, [slugDailyMap, asiaTrackerSlug, asiaTrackerDays]);

  const asiaTrackerChartData = useMemo(
    () => (asiaTrendMaOn ? applyMovingAverage(asiaTrackerSeries, asiaTrendMaWindowDays) : asiaTrackerSeries),
    [asiaTrackerSeries, asiaTrendMaWindowDays, asiaTrendMaOn]
  );

  const asiaTrackerSummary = useMemo(() => {
    const primary = computeTrendDiff(asiaTrackerChartData);
    if (primary) return primary;
    if (!asiaTrackerSlug) return null;
    const fullSeries = slugDailyMap.get(asiaTrackerSlug) ?? [];
    const baseSeries = asiaTrendMaOn ? applyMovingAverage(fullSeries, asiaTrendMaWindowDays) : fullSeries;
    return computeTrendDiff(baseSeries);
  }, [asiaTrackerChartData, asiaTrackerSlug, slugDailyMap, asiaTrendMaWindowDays, asiaTrendMaOn]);

  const asiaLiveRows = useMemo(() => liveGamesList.filter((row) => ASIA_GAME_KEY_SET.has(row.id)), [liveGamesList]);

  const asiaLiveTotal = useMemo(() => {
    let hasValue = false;
    const sum = asiaLiveRows.reduce((acc, row) => {
      if (Number.isFinite(row.players)) {
        hasValue = true;
        return acc + row.players;
      }
      return acc;
    }, 0);
    return hasValue ? sum : null;
  }, [asiaLiveRows]);

  const asiaLiveShare = useMemo(() => {
    if (!Number.isFinite(totalLivePlayers) || !Number.isFinite(asiaLiveTotal)) return null;
    if (!totalLivePlayers || totalLivePlayers <= 0) return null;
    return asiaLiveTotal / totalLivePlayers;
  }, [asiaLiveTotal, totalLivePlayers]);

  const asiaRankingRows = useMemo(
    () => rankingRows.filter((row) => ASIA_GAME_KEY_SET.has(row.slug)),
    [rankingRows]
  );

  const asiaTableRows = useMemo(() => {
    const rows = [];
    const liveMap = new Map(asiaLiveRows.map((row) => [row.id, row]));
    const rankingMap = new Map(asiaRankingRows.map((row) => [row.slug, row]));
    ASIA_GAME_KEYS.forEach((key) => {
      const game = SLUG_TO_GAME.get(key);
      if (!game) return;
      const live = liveMap.get(game.id);
      const ranking = rankingMap.get(key);
      rows.push({
        slug: key,
        label: game.label || key,
        color: GAME_COLORS?.[game.id] || "#38bdf8",
        livePlayers: Number.isFinite(live?.players) ? live.players : null,
        avgPlayers: Number.isFinite(ranking?.avgPlayers) ? ranking.avgPlayers : null,
      });
    });
    rows.sort((a, b) => {
      const aLive = a.livePlayers ?? -Infinity;
      const bLive = b.livePlayers ?? -Infinity;
      if (aLive !== bLive) return bLive - aLive;
      const aAvg = a.avgPlayers ?? -Infinity;
      const bAvg = b.avgPlayers ?? -Infinity;
      return bAvg - aAvg;
    });
    return rows;
  }, [asiaLiveRows, asiaRankingRows]);

  return {
    translate,
    numberFormatter,
    percentFormatter,
    timeFormatter,
    detailView,
    setDetailView,
    trendDays,
    setTrendDays,
    athDays,
    setAthDays,
    overviewLoading,
    overviewError,
    loadingLive,
    liveGamesList,
    visibleLiveGames,
    showAllLive,
    setShowAllLive,
    showAllAth,
    setShowAllAth,
    trendBoostOn,
    setTrendBoostOn,
    lobbyBoostOn,
    toggleLobbyBoost,
    trendMaOn,
    setTrendMaOn,
    gameTrendMaOn,
    setGameTrendMaOn,
    trendMaWindowDays,
    setTrendMaWindowDays,
    gameTrendMaWindowDays,
    setGameTrendMaWindowDays,
    asiaTrendMaWindowDays,
    setAsiaTrendMaWindowDays,
    trendSummaryForView,
    trendUpdatedLabel,
    trendChartData: boostedTrendChartData,
    athRows,
    rankingRows,
    topGrowthUseMa,
    topGrowthDisplay,
    topGrowthDays: TOP_GROWTH_DAYS,
    hourlyByHourRows,
    hourlyComparisonMeta,
    playersUpdatedText,
    totalLiveDisplayValue,
    todayPeakDisplayValue,
    todayPeakMetaText,
    yesterdayPeakDisplayValue,
    yesterdayPeakMetaText,
    lobbyAthDisplay,
    showYesterdayPeakCard: SHOW_YESTERDAY_PEAK_CARD,
    TREND_DAY_OPTIONS,
    MA_WINDOW_OPTIONS,
    ATH_DAY_OPTIONS,
    INITIAL_VISIBLE_ATH,
    gameTrendOptions,
    gameTrendSlug,
    setGameTrendSlug,
    gameTrendDays,
    setGameTrendDays,
    gameTrendMaOn,
    selectedGameOption,
    gameTrendChartData,
    gameTrendSummary,
    asiaTrackerSlug,
    setAsiaTrackerSlug,
    asiaTrackerDays,
    setAsiaTrackerDays,
    asiaViewMode,
    setAsiaViewMode,
    asiaTrendMaOn,
    setAsiaTrendMaOn,
    selectedAsiaOption,
    asiaTrendOptions,
    asiaTrendChartDataForView,
    asiaTrendSummary,
    asiaTrackerChartData,
    asiaTrackerSummary,
    asiaLiveTotal,
    asiaLiveShare,
    asiaTableRows,
    formatDateTime,
  };
}
