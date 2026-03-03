'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Divider,
} from "@mui/material";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIos from "@mui/icons-material/ArrowForwardIos";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { useAuth } from "@/context/AuthContext";
import { GAMES as GAME_CONFIG, COLORS as GAME_COLORS } from "@/config/games";
import { fetchOverviewSharedWithOptions } from "@/lib/csOverviewClient";
import { useLocale, useTranslate, LOCALE_OPTIONS } from "@/context/LocaleContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";

// ===================== LocalStorage-backed cache with TTL =====================
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
    } catch { /* ignore quota errors */ }
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
        } catch { localStorage.removeItem(k); }
      }
    } catch {}
  }
}

const overviewCache = new PersistentCache("overview_");
const OVERVIEW_TTL = 2 * 60 * 1000; // 2 min
// ============================================================================

// ====== NEW: storage-nycklar för boost-knappar ======
const TREND_BOOST_STORAGE_KEY = "trend_boost_10pct";
const LOBBY_BOOST_STORAGE_KEY = "lobby_boost_10pct";
const ATH_FORCE_REFRESH_STORAGE_KEY = "ath_force_refresh_last_at";
const ATH_FORCE_REFRESH_MS = 3 * 60 * 60 * 1000; // 3h

const TREND_DAY_OPTIONS = [30, 60, 90, 180];
const MA_WINDOW_OPTIONS = [7, 14, 30];
const TOP_GROWTH_DAYS = 90;
const ATH_DAY_OPTIONS = [90, 180, 365];
const INITIAL_VISIBLE_LIVE = 10;
const INITIAL_VISIBLE_ATH = 10;
const TZ = "Europe/Stockholm";

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

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const getStockholmTodayYmd = () => {
  try {
    const formatted = dateFormatter.format(new Date());
    return formatted.replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
  } catch {
    return null;
  }
};

const formatDateOnly = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return dateFormatter.format(date);
  } catch {
    return null;
  }
};

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

const SLUG_TO_GAME = (() => {
  const map = new Map();
  (GAME_CONFIG || []).forEach((game) => {
    if (game?.slug) map.set(game.slug, game);
    if (game?.id) map.set(game.id, game);
  });
  return map;
})();

const normalizeDailySeries = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const date = row?.date ?? row?.Datum ?? null;
      const avgRaw = row?.avgPlayers ?? row?.avg ?? row?.Players ?? row?.players;
      const avg = Number(avgRaw);
      if (!date || !Number.isFinite(avg)) return null;
      return { date, players: Math.round(avg) };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
};

const normalizeTrendDelta = (value) => {
  if (!value || typeof value !== "object") return null;
  const startValue = Number(value?.start?.value);
  const endValue = Number(value?.end?.value);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  const startDate = value?.start?.date ?? null;
  const endDate = value?.end?.date ?? null;
  const absolute = Number(value?.absolute);
  const percent = Number(value?.percent);
  return {
    start: startDate ? { date: startDate, value: Math.round(startValue) } : null,
    end: endDate ? { date: endDate, value: Math.round(endValue) } : null,
    absolute: Number.isFinite(absolute) ? absolute : Math.round((endValue - startValue) * 100) / 100,
    percent: Number.isFinite(percent)
      ? percent
      : startValue !== 0
      ? Math.round(((endValue - startValue) / startValue) * 10000) / 100
      : null,
  };
};

const normalizeTodayPeak = (value) => {
  if (!value || typeof value !== "object") return null;
  const num = Number(value?.value);
  if (!Number.isFinite(num)) return null;
  const at = typeof value?.at === "string" ? value.at : null;
  return { value: Math.round(num), at };
};

const normalizeLobbyAth = (value) => {
  if (!value || typeof value !== "object") return null;
  const num = Number(value?.value);
  if (!Number.isFinite(num)) return null;
  const date = typeof value?.date === "string" ? value.date : null;
  return { value: Math.round(num), date };
};

const computeTrendDiff = (series, key = "players") => {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const startValue = Number(first?.[key]);
  const endValue = Number(last?.[key]);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  const absolute = Math.round((endValue - startValue) * 100) / 100;
  const percent =
    startValue !== 0 ? Math.round(((endValue - startValue) / startValue) * 10000) / 100 : null;
  return {
    start: { date: first?.date ?? null, value: startValue },
    end: { date: last?.date ?? null, value: endValue },
    absolute,
    percent,
  };
};

const applyMovingAverage = (series, windowSize, key = "players") => {
  if (!Array.isArray(series) || !series.length) return [];
  const size = Math.max(1, Math.floor(windowSize || 1));
  const result = [];
  const window = [];
  let sum = 0;

  for (const row of series) {
    const value = Number(row?.[key]);
    if (!Number.isFinite(value)) continue;
    window.push(value);
    sum += value;
    if (window.length > size) sum -= window.shift();
    const avg = Math.round((sum / window.length) * 100) / 100;
    result.push({ ...row, [key]: avg });
  }

  return result;
};

const LivePlayersControlPanel = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const mobileCardsRef = useRef(null);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);

  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllAth, setShowAllAth] = useState(false);

  // ===== NEW: +10% boost on/off (med localStorage ihågkomst)
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

  // -------- Overview (Trend + Ranking) med localStorage-cache --------
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
      const map = new Map(
        cachedDailyEntries.map(([slug, arr]) => [slug, normalizeDailySeries(arr)])
      );
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

  // --------- Deriverad UI-data ----------
  const rawTodayPeak = lobbyStats?.todayPeak ?? todayPeak;
  const mergedYesterdayPeak = lobbyStats?.yesterdayPeak ?? yesterdayPeak;
  const mergedLobbyAth = lobbyStats?.lobbyAth ?? lobbyAth;
  const stockholmTodayYmd = getStockholmTodayYmd();

  const stabilizedTodayPeak = useMemo(() => {
    const athValue = Number(mergedLobbyAth?.value);
    const todayValue = Number(rawTodayPeak?.value);
    const athDate = mergedLobbyAth?.date ?? (mergedLobbyAth?.at ? mergedLobbyAth.at.slice(0, 10) : null);
    const athIsToday = athDate && athDate === stockholmTodayYmd;
    if (
      athIsToday &&
      Number.isFinite(athValue) &&
      (!Number.isFinite(todayValue) || athValue > todayValue)
    ) {
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
      const av = a.players, bv = b.players;
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
    if (
      !Number.isFinite(delta) ||
      !Number.isFinite(baseline) ||
      baseline <= 0 ||
      !Number.isFinite(samples) ||
      samples <= 0 ||
      !hour
    ) {
      return null;
    }
    const sign = delta > 0 ? "+" : "";
    const baselineLabel = numberFormatter.format(Math.round(baseline));
    const text = translate(
      `${hour}:00 vs 60d-snitt: ${sign}${percentFormatter.format(delta)}% (bas ${baselineLabel})`,
      `${hour}:00 vs 60d avg: ${sign}${percentFormatter.format(delta)}% (base ${baselineLabel})`
    );
    const color =
      delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "rgba(148,163,184,0.75)";
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
    const dateLabel = isToday
      ? todayPeakTimeInfo?.full || "Idag"
      : date
      ? formatDateOnly(date)
      : null;
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

  // ===== NEW: applicera +10% boost på serie & summering
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

  // Fallback mot serverns trendDelta om vår serie saknas
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

  const asiaTrendSummary = useMemo(
    () => computeTrendDiff(asiaTrendChartDataForView),
    [asiaTrendChartDataForView]
  );

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

  const asiaLiveRows = useMemo(
    () => liveGamesList.filter((row) => ASIA_GAME_KEY_SET.has(row.id)),
    [liveGamesList]
  );

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

  // ====================== RENDER ======================
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: { xs: 0, md: "18px" },
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        color: "#f8fafc",

        // BLEED inom sidan/container
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        overflow: "visible",
      }}
    >
      <Stack spacing={{ xs: 2.2, md: 3.2 }}>
        {/* Header */}
        <Stack spacing={{ xs: 1, md: 1.25 }} alignItems="center" textAlign="center">
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.8rem", sm: "2.3rem" } }}>
            {translate("Gameshow live-data & historik", "Gameshow live data & history")}
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(226,232,240,0.75)", maxWidth: 760, lineHeight: 1.6 }}>
            {translate(
              "En förädlad vy över live-spelare, trendutveckling, ranking och toppnoteringar. Uppdateras automatiskt med lobbydata.",
              "A refined view of live players, trend development, rankings and peak records. Updates automatically with lobby data."
            )}
          </Typography>
        </Stack>

        {/* Totalt live + lobbykort + list */}
        <Stack spacing={{ xs: 2, md: 3 }} sx={{ width: "100%" }}>
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                display: "inline-flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: { xs: 2, md: 3 },
                width: "100%",
                maxWidth: SHOW_YESTERDAY_PEAK_CARD ? 1712 : 1368,
              }}
            >
              <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    background: "rgba(15,23,42,0.45)",
                    borderRadius: "16px",
                    border: "1px solid rgba(52,211,153,0.45)",
                    p: { xs: 2, md: 2.5 },
                    width: { xs: "100%", sm: 320 },
                    mx: "auto",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  textAlign: "center",
                }}
              >
                <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
                  {translate("Totalt live", "Total live players")}
                </Typography>
                  {loadingLive ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                        {translate("Hämtar live-data…", "Fetching live data…")}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#34d399" }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                          {totalLiveDisplayValue != null ? numberFormatter.format(totalLiveDisplayValue) : "—"}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                        {playersUpdatedText}
                      </Typography>
                      {hourlyComparisonMeta ? (
                        <Typography variant="caption" sx={{ color: hourlyComparisonMeta.color }}>
                          {hourlyComparisonMeta.text}
                        </Typography>
                      ) : null}
                      {lobbyBoostOn && (
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
                          {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        label={lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")}
                        onClick={toggleLobbyBoost}
                        clickable
                        sx={{
                          borderRadius: "999px",
                          mt: 0.5,
                          alignSelf: "center",
                          backgroundColor: lobbyBoostOn ? "rgba(52,211,153,0.18)" : "rgba(15,23,42,0.6)",
                          color: lobbyBoostOn ? "#34d399" : "rgba(248,250,252,0.85)",
                          border: lobbyBoostOn ? "1px solid rgba(52,211,153,0.45)" : "1px solid rgba(148,163,184,0.35)",
                          fontWeight: 600,
                        }}
                      />
                    </>
                  )}
                </Box>
              </Box>

              <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    background: "rgba(15,23,42,0.45)",
                    borderRadius: "16px",
                    border: "1px solid rgba(251,113,133,0.25)",
                    p: { xs: 2, md: 2.5 },
                    width: { xs: "100%", sm: 320 },
                    mx: "auto",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="overline"
                    sx={{ color: "rgba(251,113,133,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                  >
                    {translate("Dagens lobby-peak", "Today's lobby peak")}
                  </Typography>
                  {overviewLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#fb7185" }} />
                      <Typography variant="body2" sx={{ color: "rgba(251,113,133,0.8)" }}>
                        {translate("Analyserar mätpunkter…", "Analysing datapoints…")}
                      </Typography>
                    </Box>
                  ) : todayPeakDisplayValue != null ? (
                    <>
                      <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fb7185" }} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {numberFormatter.format(todayPeakDisplayValue)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                        {todayPeakMetaText}
                      </Typography>
                      {lobbyBoostOn && (
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                          {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        label={
                          lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")
                        }
                        onClick={toggleLobbyBoost}
                        clickable
                        sx={{
                          borderRadius: "999px",
                          mt: 0.5,
                          alignSelf: "center",
                          backgroundColor: lobbyBoostOn ? "rgba(251,113,133,0.18)" : "rgba(15,23,42,0.6)",
                          color: lobbyBoostOn ? "#fb7185" : "rgba(248,250,252,0.85)",
                          border: lobbyBoostOn ? "1px solid rgba(251,113,133,0.4)" : "1px solid rgba(148,163,184,0.35)",
                          fontWeight: 600,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                        {translate("Inga datapunkter registrerade för idag ännu.", "No datapoints registered yet today.")}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              {SHOW_YESTERDAY_PEAK_CARD && (
                <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
                  <Box
                    sx={{
                      background: "rgba(15,23,42,0.45)",
                      borderRadius: "16px",
                      border: "1px solid rgba(251,191,36,0.25)",
                      p: { xs: 2, md: 2.5 },
                      width: { xs: "100%", sm: 320 },
                      mx: "auto",
                      minHeight: 180,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ color: "rgba(251,191,36,0.9)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                    >
                      {translate("Gårdagens peak", "Yesterday's peak")}
                    </Typography>
                    {overviewLoading ? (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <CircularProgress size={18} sx={{ color: "#fbbf24" }} />
                        <Typography variant="body2" sx={{ color: "rgba(251,191,36,0.85)" }}>
                          {translate("Hämtar gårdagens mätning…", "Fetching yesterday's measurement…")}
                        </Typography>
                      </Box>
                    ) : yesterdayPeakDisplayValue != null ? (
                      <>
                        <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fbbf24" }} />
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {numberFormatter.format(yesterdayPeakDisplayValue)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                          {yesterdayPeakMetaText}
                        </Typography>
                        {lobbyBoostOn && (
                          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                            {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                          </Typography>
                        )}
                        <Chip
                          size="small"
                          label={
                            lobbyBoostOn
                              ? translate("+10% aktiv", "+10% active")
                              : translate("Simulera +10%", "Simulate +10%")
                          }
                          onClick={toggleLobbyBoost}
                          clickable
                          sx={{
                            borderRadius: "999px",
                            mt: 0.5,
                            alignSelf: "center",
                            backgroundColor: lobbyBoostOn ? "rgba(251,191,36,0.18)" : "rgba(15,23,42,0.6)",
                            color: lobbyBoostOn ? "#fbbf24" : "rgba(248,250,252,0.85)",
                            border: lobbyBoostOn ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(148,163,184,0.35)",
                            fontWeight: 600,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                          {translate("Ingen peak registrerad för gårdagen.", "No peak recorded for yesterday.")}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              )}
              <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    background: "rgba(15,23,42,0.45)",
                    borderRadius: "16px",
                    border: "1px solid rgba(96,165,250,0.25)",
                    p: { xs: 2, md: 2.5 },
                    width: { xs: "100%", sm: 320 },
                    mx: "auto",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="overline"
                    sx={{ color: "rgba(191,219,254,0.95)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                  >
                    {translate("Lobbyns ATH", "Lobby ATH")}
                  </Typography>
                  {overviewLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#93c5fd" }} />
                      <Typography variant="body2" sx={{ color: "rgba(191,219,254,0.85)" }}>
                        {translate("Hämtar historik…", "Fetching history…")}
                      </Typography>
                    </Box>
                  ) : lobbyAthDisplay ? (
                    <>
                      <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#93c5fd" }} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {numberFormatter.format(lobbyAthDisplay.value)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                        {lobbyAthDisplay.isToday
                          ? lobbyAthDisplay.dateLabel
                            ? translate(`Ny topp idag (${lobbyAthDisplay.dateLabel})`, `New high today (${lobbyAthDisplay.dateLabel})`)
                            : translate("Ny topp idag", "New high today")
                          : lobbyAthDisplay.dateLabel
                          ? translate(`Uppnåddes ${lobbyAthDisplay.dateLabel}`, `Reached ${lobbyAthDisplay.dateLabel}`)
                          : translate("Datum okänt", "Date unknown")}
                      </Typography>
                      {lobbyBoostOn && (
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center" }}>
                          {translate("Visar simulerat värde (+10%).", "Showing simulated value (+10%).")}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        label={
                          lobbyBoostOn ? translate("+10% aktiv", "+10% active") : translate("Simulera +10%", "Simulate +10%")
                        }
                        onClick={toggleLobbyBoost}
                        clickable
                        sx={{
                          borderRadius: "999px",
                          mt: 0.5,
                          alignSelf: "center",
                          backgroundColor: lobbyBoostOn ? "rgba(96,165,250,0.18)" : "rgba(15,23,42,0.6)",
                          color: lobbyBoostOn ? "#93c5fd" : "rgba(248,250,252,0.85)",
                          border: lobbyBoostOn ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(148,163,184,0.35)",
                          fontWeight: 600,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                        {translate("Ingen ATH-data kunde beräknas.", "No ATH data could be calculated.")}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 320 }, display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    background: "rgba(15,23,42,0.45)",
                    borderRadius: "16px",
                    border: "1px solid rgba(34,197,94,0.28)",
                    p: { xs: 2, md: 2.5 },
                    width: { xs: "100%", sm: 320 },
                    mx: "auto",
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="overline"
                    sx={{ color: "rgba(134,239,172,0.95)", letterSpacing: 1.2, fontWeight: 600, textAlign: "center" }}
                  >
                    {translate(
                      topGrowthUseMa
                        ? `Störst tillväxt (${TOP_GROWTH_DAYS} dagar, MA)`
                        : `Störst tillväxt (${TOP_GROWTH_DAYS} dagar)`,
                      topGrowthUseMa
                        ? `Top growth (${TOP_GROWTH_DAYS} days, MA)`
                        : `Top growth (${TOP_GROWTH_DAYS} days)`
                    )}
                  </Typography>
                  {overviewLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#86efac" }} />
                      <Typography variant="body2" sx={{ color: "rgba(134,239,172,0.85)" }}>
                        {translate("Hämtar trenddata…", "Fetching trend data…")}
                      </Typography>
                    </Box>
                  ) : topGrowthDisplay ? (
                    topGrowthDisplay.hasPositive ? (
                      <>
                        <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: topGrowthDisplay.color }} />
                          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: "center" }}>
                            {topGrowthDisplay.label}
                          </Typography>
                        </Stack>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#86efac", textAlign: "center" }}>
                          {topGrowthDisplay.percentText}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                          {translate(`Senaste ${TOP_GROWTH_DAYS} dagar`, `Last ${TOP_GROWTH_DAYS} days`)}
                          {topGrowthUseMa
                            ? translate(` • glidande snitt ${TOP_GROWTH_DAYS}d`, ` • moving avg ${TOP_GROWTH_DAYS}d`)
                            : ""}
                          {topGrowthDisplay.rangeText ? ` • ${topGrowthDisplay.rangeText}` : ""}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                        {translate(
                          `Ingen positiv tillväxt senaste ${TOP_GROWTH_DAYS} dagarna.`,
                          `No positive growth in the last ${TOP_GROWTH_DAYS} days.`
                        )}
                        {topGrowthUseMa
                          ? translate(" (glidande snitt)", " (moving avg)")
                          : ""}
                      </Typography>
                    )
                  ) : (
                    <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                      {translate("Ingen trenddata tillgänglig.", "No trend data available.")}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {hourlyByHourRows.length ? (
            <Box
              sx={{
                width: "100%",
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.18)",
                p: { xs: 2, md: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.9)", letterSpacing: 1.2, fontWeight: 600 }}>
                  {translate("Timsnitt (lokal) vs live nu", "Hourly baseline (local) vs live now")}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.68)" }}>
                  {translate("Visar 00–23 mot nuvarande live-total", "Shows 00–23 versus current live total")}
                </Typography>
              </Stack>
              <Grid container spacing={1.2}>
                {hourlyByHourRows.map((row) => {
                  const deltaText =
                    Number.isFinite(row.delta) ? `${row.delta > 0 ? "+" : ""}${percentFormatter.format(row.delta)}%` : "—";
                  const deltaColor =
                    Number.isFinite(row.delta) && row.delta > 0
                      ? "#86efac"
                      : Number.isFinite(row.delta) && row.delta < 0
                      ? "#fca5a5"
                      : "rgba(226,232,240,0.8)";
                  return (
                    <Grid key={`hourly-${row.hour}`} item xs={12} sm={6} md={4} lg={3}>
                      <Box
                        sx={{
                          borderRadius: "12px",
                          border: row.isCurrentHour
                            ? "1px solid rgba(56,189,248,0.55)"
                            : "1px solid rgba(148,163,184,0.25)",
                          background: row.isCurrentHour ? "rgba(56,189,248,0.08)" : "rgba(2,6,23,0.34)",
                          p: 1.2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.4,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.95)", fontWeight: 700 }}>
                          {row.hour}:00
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                          {translate("Snitt", "Avg")}: {numberFormatter.format(row.baseline)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                          {translate("Live", "Live")}:{" "}
                          {row.currentTotal != null ? numberFormatter.format(row.currentTotal) : "—"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: deltaColor, fontWeight: 600 }}>
                          {translate("Diff", "Delta")}: {deltaText}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
                          {translate("Samples", "Samples")}: {numberFormatter.format(row.samples)}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ) : null}

          <Box sx={{ width: "100%" }}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.18)",
                p: { xs: 2, md: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
                  {translate("Liveshower just nu", "Live shows right now")}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                  {loadingLive
                    ? translate("Uppdaterar…", "Updating…")
                    : translate(`Totalt ${liveGamesList.length} spel`, `Total ${liveGamesList.length} games`)}
                </Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {loadingLive && (
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                        {translate("Hämtar live-data…", "Fetching live data…")}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {!loadingLive &&
                  visibleLiveGames.map((item, index) => (
                    <Grid key={item.id} item xs={12} sm={6} md={4} lg={3}>
                      <Box
                        sx={{
                          background: `linear-gradient(135deg, ${item.color}22, rgba(15,23,42,0.65))`,
                          borderRadius: "14px",
                          border: `1px solid ${item.color}44`,
                          p: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.75,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
                            #{index + 1}
                          </Typography>
                          <Chip
                            size="small"
                            label={Number.isFinite(item.players) ? numberFormatter.format(item.players) : "—"}
                            sx={{
                              backgroundColor: "rgba(15,23,42,0.55)",
                              color: item.color,
                              border: `1px solid ${item.color}55`,
                              borderRadius: "999px",
                            }}
                          />
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                          {item.updated
                            ? translate(
                                `Senast ${timeFormatter.format(new Date(item.updated))}`,
                                `Last updated ${timeFormatter.format(new Date(item.updated))}`
                              )
                            : translate("Ingen tidsstämpel", "No timestamp")}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                {!loadingLive && !liveGamesList.length && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                      {translate("Ingen live-data tillgänglig just nu.", "No live data available right now.")}
                    </Typography>
                  </Grid>
                )}
                {!loadingLive && liveGamesList.length > visibleLiveGames.length && (
                  <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                    <Chip
                      label={showAllLive ? translate("Visa mindre", "Show less") : translate("Visa fler", "Show more")}
                      onClick={() => setShowAllLive((prev) => !prev)}
                      clickable
                      sx={{
                        backgroundColor: "rgba(148,163,184,0.12)",
                        color: "#cbd5f5",
                        borderRadius: "999px",
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </Box>
        </Stack>
        {/* Toggle mellan sektioner */}
        <ToggleButtonGroup
          value={detailView}
          exclusive
          onChange={(_, value) => value && setDetailView(value)}
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
            alignSelf: "center",
          }}
        >
          <ToggleButton
            value="trend"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}
          >
            {translate("Trend", "Trend")}
          </ToggleButton>
          <ToggleButton
            value="gameTrend"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(74,222,128,0.28)" } }}
          >
            {translate("Speltrend", "Game trend")}
          </ToggleButton>
          <ToggleButton
            value="asia"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(248,250,133,0.28)" } }}
          >
            {translate("Asia Tracker", "Asia Tracker")}
          </ToggleButton>
          <ToggleButton
            value="ranking"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}
          >
            {translate("Ranking", "Ranking")}
          </ToggleButton>
          <ToggleButton
            value="ath"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(192,132,252,0.28)" } }}
          >
            {translate("ATH", "ATH")}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Sektioner */}
        {detailView === "trend" && (
          <TrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            trendChartData={boostedTrendChartData}
            trendSummary={trendSummaryForView}
            trendDays={trendDays}
            trendUpdatedLabel={trendUpdatedLabel}
            onChangeDays={setTrendDays}
            boostOn={trendBoostOn}
            onToggleBoost={() => setTrendBoostOn((v) => !v)}
            movingAverageOn={trendMaOn}
            onToggleMovingAverage={() => setTrendMaOn((v) => !v)}
            movingAverageDays={trendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
          />
        )}

        {detailView === "gameTrend" && (
          <GameTrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            options={gameTrendOptions}
            selectedSlug={gameTrendSlug}
            onSelectSlug={setGameTrendSlug}
            trendUpdatedLabel={trendUpdatedLabel}
            chartData={gameTrendChartData}
            summary={gameTrendSummary}
            selectedOption={selectedGameOption}
            dayOptions={TREND_DAY_OPTIONS}
            days={gameTrendDays}
            onChangeDays={setGameTrendDays}
            movingAverageOn={gameTrendMaOn}
            onToggleMovingAverage={() => setGameTrendMaOn((v) => !v)}
            movingAverageDays={gameTrendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setGameTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
          />
        )}

        {detailView === "asia" && (
          <AsiaTrackerSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            lastUpdatedLabel={trendUpdatedLabel}
            totalLive={asiaLiveTotal}
            liveShare={asiaLiveShare}
            tableRows={asiaTableRows}
            options={asiaTrendOptions}
            selectedSlug={asiaTrackerSlug}
            onSelectSlug={setAsiaTrackerSlug}
            viewMode={asiaViewMode}
            onChangeViewMode={setAsiaViewMode}
            trendChartData={asiaTrendChartDataForView}
            trendSummary={asiaTrendSummary}
            gameChartData={asiaTrackerChartData}
            gameSummary={asiaTrackerSummary}
            selectedOption={selectedAsiaOption}
            dayOptions={TREND_DAY_OPTIONS}
            days={asiaTrackerDays}
            onChangeDays={setAsiaTrackerDays}
            movingAverageOn={asiaTrendMaOn}
            onToggleMovingAverage={() => setAsiaTrendMaOn((v) => !v)}
            movingAverageDays={asiaTrendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setAsiaTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
          />
        )}

        {detailView === "ranking" && (
          <RankingSection
            rankingRows={rankingRows}
            overviewLoading={overviewLoading}
            numberFormatter={numberFormatter}
            translate={translate}
          />
        )}

        {detailView === "ath" && (
          <AthSection
            athRows={athRows}
            athDays={athDays}
            onChangeDays={setAthDays}
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            showAllAth={showAllAth}
            toggleShowAll={() => setShowAllAth((prev) => !prev)}
            numberFormatter={numberFormatter}
            translate={translate}
          />
        )}
      </Stack>
    </Box>
  );
};

// ================== Sektioner ==================
const TrendSection = ({
  overviewLoading,
  overviewError,
  trendChartData,
  trendSummary,
  trendDays,
  trendUpdatedLabel,
  onChangeDays,
  // NEW:
  boostOn,
  onToggleBoost,
  movingAverageOn,
  onToggleMovingAverage,
  movingAverageDays,
  movingAverageOptions,
  onChangeMovingAverageDays,
  numberFormatter,
  translate,
  percentFormatter,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const formatSigned = (value) => {
    if (!Number.isFinite(value)) return "—";
    const abs = numberFormatter.format(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  };
  const changeColor =
    trendSummary && Number.isFinite(trendSummary.absolute)
      ? trendSummary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    trendSummary && Number.isFinite(trendSummary.percent)
      ? `${trendSummary.percent > 0 ? "+" : ""}${percentFormatter.format(trendSummary.percent)}%`
      : "—";
  const absoluteText =
    trendSummary && Number.isFinite(trendSummary.absolute) ? formatSigned(trendSummary.absolute) : "—";
  const startText =
    trendSummary?.start?.value != null ? numberFormatter.format(trendSummary.start.value) : "—";
  const endText =
    trendSummary?.end?.value != null ? numberFormatter.format(trendSummary.end.value) : "—";
  const startDateText = formatDateOnly(trendSummary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(trendSummary?.end?.date) ?? "—";
  const movingAverageLabel = translate(
    `Glidande snitt ${movingAverageDays}d`,
    `Moving avg ${movingAverageDays}d`
  );
  const tooltipLabel = movingAverageOn
    ? movingAverageLabel
    : translate("Genomsnitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const xAxisTicks = useMemo(() => {
    if (!Array.isArray(trendChartData) || !trendChartData.length) return undefined;
    if (trendChartData.length <= maxXTicks) return trendChartData.map((row) => row.date);
    const step = Math.ceil((trendChartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < trendChartData.length; index += step) {
      ticks.push(trendChartData[index].date);
    }
    const lastDate = trendChartData[trendChartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [trendChartData, maxXTicks]);

  const formatAxisDate = useCallback(
    (value) => {
      if (!value) return "";
      const text = String(value);
      return isMobile ? text.slice(5) : text;
    },
    [isMobile]
  );

  const formatPlayersAxis = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      if (!isMobile) return numberFormatter.format(value);
      if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
      return numberFormatter.format(value);
    },
    [isMobile, numberFormatter]
  );

  return (
  <Box
    sx={{
      background: "rgba(15,23,42,0.45)",
      borderRadius: "16px",
      border: "1px solid rgba(148,163,184,0.18)",
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
    }}
  >
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
      <Stack spacing={0.4}>
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
          {translate("Trend – genomsnittliga spelare", "Trend – average players")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Hämtar trenddata…", "Fetching trend data…")
            : trendUpdatedLabel
            ? translate(`Senast uppdaterad ${trendUpdatedLabel}`, `Last updated ${trendUpdatedLabel}`)
            : overviewError || translate("Ingen trenddata", "No trend data")}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        {/* +10% boost toggle */}
        <Chip
          label={boostOn ? translate("Boost +10% (på)", "Boost +10% (on)") : translate("Boost +10%", "Boost +10%")}
          onClick={onToggleBoost}
          clickable
          sx={{
            borderRadius: "999px",
            backgroundColor: boostOn ? "rgba(74,222,128,0.22)" : "rgba(148,163,184,0.12)",
            color: boostOn ? "#34d399" : "rgba(226,232,240,0.85)",
            border: boostOn ? "1px solid rgba(74,222,128,0.55)" : "1px solid transparent",
            fontWeight: boostOn ? 700 : 500,
          }}
        />

        <Chip
          label={movingAverageOn ? `${movingAverageLabel} (${translate("på", "on")})` : movingAverageLabel}
          onClick={onToggleMovingAverage}
          clickable
          sx={{
            borderRadius: "999px",
            backgroundColor: movingAverageOn ? "rgba(56,189,248,0.2)" : "rgba(148,163,184,0.12)",
            color: movingAverageOn ? "#7dd3fc" : "rgba(226,232,240,0.85)",
            border: movingAverageOn ? "1px solid rgba(56,189,248,0.45)" : "1px solid transparent",
            fontWeight: movingAverageOn ? 700 : 500,
          }}
        />
        {movingAverageOn && (
          <ToggleButtonGroup
            value={movingAverageDays}
            exclusive
            size="small"
            onChange={(_, value) => value && onChangeMovingAverageDays?.(value)}
            sx={{
              backgroundColor: "rgba(56,189,248,0.12)",
              borderRadius: "999px",
              p: 0.5,
            }}
          >
            {(movingAverageOptions || MA_WINDOW_OPTIONS).map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  color: "rgba(226,232,240,0.75)",
                  border: 0,
                  borderRadius: "999px!important",
                  px: { xs: 1.25, md: 1.75 },
                  "&.Mui-selected": {
                    color: "#f8fafc",
                    backgroundColor: "rgba(56,189,248,0.35)",
                  },
                }}
              >
                MA {option}d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        {/* Dagar */}
        <ToggleButtonGroup
          value={trendDays}
          exclusive
          onChange={(_, value) => value && onChangeDays(value)}
          size="small"
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
          }}
        >
          {TREND_DAY_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.75)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.5, md: 2 },
                "&.Mui-selected": {
                  color: "#f8fafc",
                  backgroundColor: "rgba(56,189,248,0.28)",
                },
              }}
            >
              {option} d
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </Stack>

    {boostOn && (
      <Box
        sx={{
          background: "linear-gradient(90deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))",
          border: "1px solid rgba(34,197,94,0.35)",
          borderRadius: "12px",
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 700 }}>
          {translate(
            "Simulerar EVOS riktiga lobby: +10% ökning på trenden (visas i graf & tooltip)",
            "Simulating EVOS real lobby: +10% boost applied to the trend (shown in chart & tooltip)"
          )}
        </Typography>
      </Box>
    )}

    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 0.75, md: 2 }}
      alignItems={{ xs: "flex-start", md: "center" }}
      justifyContent="space-between"
      sx={{ color: "rgba(148,163,184,0.75)" }}
    >
      <Typography variant="caption">
        {translate("Start", "Start")}: <strong>{startText}</strong> ({startDateText})
      </Typography>
      <Typography variant="caption">
        {translate("Slut", "End")}: <strong>{endText}</strong> ({endDateText})
      </Typography>
      <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600 }}>
        {translate("Förändring", "Change")}: {absoluteText} ({percentText}) {boostOn ? translate("• (boost +10%)", "• (boost +10%)") : ""}
        {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
      </Typography>
    </Stack>

    <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
      {overviewLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            {translate("Laddar spelardata…", "Loading player data…")}
          </Typography>
        </Box>
      ) : trendChartData.length ? (
        <ResponsiveContainer>
          <AreaChart
            data={trendChartData}
            margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="liveTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              ticks={xAxisTicks}
              interval={0}
              tickFormatter={formatAxisDate}
              minTickGap={isMobile ? 26 : 18}
              tickMargin={8}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              width={isMobile ? 40 : 60}
              tickFormatter={formatPlayersAxis}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(96,165,250,0.25)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              formatter={(value) => [
                `${numberFormatter.format(value)} ${translate("spelare", "players")}${boostOn ? " (boost +10%)" : ""}`,
                tooltipLabel,
              ]}
            />
            <Area
              type="monotone"
              dataKey="players"
              stroke="#38bdf8"
              strokeWidth={isMobile ? 2.2 : 2.5}
              fill="url(#liveTrendGradient)"
              fillOpacity={1}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(148,163,184,0.75)",
          }}
        >
          {translate("Ingen trenddata tillgänglig.", "No trend data available.")}
        </Box>
      )}
    </Box>
  </Box>
  );
};

const GameTrendSection = ({
  overviewLoading,
  overviewError,
  options,
  selectedSlug,
  onSelectSlug,
  trendUpdatedLabel,
  chartData,
  summary,
  selectedOption,
  dayOptions,
  days,
  onChangeDays,
  movingAverageOn,
  onToggleMovingAverage,
  movingAverageDays,
  movingAverageOptions,
  onChangeMovingAverageDays,
  numberFormatter,
  translate,
  percentFormatter,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const formatSigned = (value) => {
    if (!Number.isFinite(value)) return "—";
    const abs = numberFormatter.format(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  };
  const changeColor =
    summary && Number.isFinite(summary.absolute)
      ? summary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    summary && Number.isFinite(summary.percent)
      ? `${summary.percent > 0 ? "+" : ""}${percentFormatter.format(summary.percent)}%`
      : "—";
  const absoluteText = summary && Number.isFinite(summary.absolute) ? formatSigned(summary.absolute) : "—";
  const startText =
    summary?.start?.value != null ? numberFormatter.format(summary.start.value) : "—";
  const endText =
    summary?.end?.value != null ? numberFormatter.format(summary.end.value) : "—";
  const startDateText = formatDateOnly(summary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(summary?.end?.date) ?? "—";
  const activeColor = selectedOption?.color ?? "#38bdf8";
  const activeLabel = selectedOption?.label ?? translate("Välj spel", "Select game");
  const movingAverageLabel = translate(
    `Glidande snitt ${movingAverageDays}d`,
    `Moving avg ${movingAverageDays}d`
  );
  const tooltipLabel = movingAverageOn
    ? movingAverageLabel
    : translate("Snitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const gameTrendTicks = useMemo(() => {
    if (!Array.isArray(chartData) || !chartData.length) return undefined;
    if (chartData.length <= maxXTicks) return chartData.map((row) => row.date);
    const step = Math.ceil((chartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < chartData.length; index += step) {
      ticks.push(chartData[index].date);
    }
    const lastDate = chartData[chartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [chartData, maxXTicks]);

  const formatAxisDate = useCallback(
    (value) => {
      if (!value) return "";
      const text = String(value);
      return isMobile ? text.slice(5) : text;
    },
    [isMobile]
  );

  const formatPlayersAxis = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      if (!isMobile) return numberFormatter.format(value);
      if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
      return numberFormatter.format(value);
    },
    [isMobile, numberFormatter]
  );

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack spacing={0.4}>
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
          {translate("Speltrend – dagligt snitt", "Game trend – daily average")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Hämtar speltrend…", "Fetching game trend…")
            : trendUpdatedLabel
            ? translate(`Senast uppdaterad ${trendUpdatedLabel}`, `Last updated ${trendUpdatedLabel}`)
            : overviewError || translate("Ingen speltrenddata", "No game trend data")}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
          {translate("Välj spel att analysera", "Select a game to analyse")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            maxHeight: { xs: 210, md: 120 },
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          {options.length ? (
            options.map((option) => {
              const isActive = option.slug === selectedSlug;
              return (
                <Chip
                  key={option.slug}
                  label={option.label}
                  onClick={() => onSelectSlug && onSelectSlug(option.slug)}
                  clickable
                  sx={{
                    borderRadius: "999px",
                    backgroundColor: isActive ? `${option.color}33` : "rgba(148,163,184,0.1)",
                    color: isActive ? option.color : "rgba(226,232,240,0.8)",
                    border: `1px solid ${isActive ? option.color : "transparent"}`,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              );
            })
          ) : (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
              {translate("Ingen speldata tillgänglig ännu.", "No game data available yet.")}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 0.75, md: 2 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="center"
        sx={{ color: "rgba(148,163,184,0.75)", textAlign: { xs: "left", md: "center" } }}
      >
        <Typography variant="caption">
          {translate("Start", "Start")}: <strong>{startText}</strong> ({startDateText})
        </Typography>
        <Typography variant="caption">
          {translate("Slut", "End")}: <strong>{endText}</strong> ({endDateText})
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
          {translate("Visa dagar", "Show days")}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label={movingAverageOn ? `${movingAverageLabel} (${translate("på", "on")})` : movingAverageLabel}
            onClick={onToggleMovingAverage}
            clickable
            sx={{
              borderRadius: "999px",
              backgroundColor: movingAverageOn ? "rgba(56,189,248,0.2)" : "rgba(148,163,184,0.12)",
              color: movingAverageOn ? "#7dd3fc" : "rgba(226,232,240,0.85)",
              border: movingAverageOn ? "1px solid rgba(56,189,248,0.45)" : "1px solid transparent",
              fontWeight: movingAverageOn ? 700 : 500,
            }}
          />
          {movingAverageOn && (
            <ToggleButtonGroup
              value={movingAverageDays}
              exclusive
              size="small"
              onChange={(_, value) => value && onChangeMovingAverageDays?.(value)}
              sx={{
                backgroundColor: "rgba(56,189,248,0.12)",
                borderRadius: "999px",
                p: 0.5,
              }}
            >
              {(movingAverageOptions || MA_WINDOW_OPTIONS).map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  sx={{
                    textTransform: "none",
                    color: "rgba(226,232,240,0.75)",
                    border: 0,
                    borderRadius: "999px!important",
                    px: { xs: 1.25, md: 1.75 },
                    "&.Mui-selected": {
                      color: "#f8fafc",
                      backgroundColor: "rgba(56,189,248,0.35)",
                    },
                  }}
                >
                  MA {option}d
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup
            value={days}
            exclusive
            size="small"
            onChange={(_, value) => value && onChangeDays(value)}
            sx={{
              backgroundColor: "rgba(148,163,184,0.12)",
              borderRadius: "999px",
              p: 0.5,
            }}
          >
            {dayOptions.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  color: "rgba(226,232,240,0.75)",
                  border: 0,
                  borderRadius: "999px!important",
                  px: { xs: 1.5, md: 2 },
                  "&.Mui-selected": {
                    color: "#f8fafd",
                    backgroundColor: "rgba(74,222,128,0.28)",
                  },
                }}
              >
                {option} d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {selectedSlug && (
        <Stack spacing={0.4} alignItems="center" sx={{ mt: 0.5, textAlign: "center" }}>
          <Typography
            variant="h6"
            sx={{
              color: activeColor,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {activeLabel}
          </Typography>
          {summary && (
            <Typography variant="subtitle2" sx={{ color: changeColor, fontWeight: 600 }}>
              {translate("Förändring", "Change")}: {absoluteText} ({percentText})
              {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
            </Typography>
          )}
        </Stack>
      )}

      <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
        {overviewLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
            <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Laddar spelardata…
            </Typography>
          </Box>
        ) : chartData.length ? (
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              barCategoryGap={isMobile ? "18%" : "22%"}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                ticks={gameTrendTicks}
                interval={0}
                tickFormatter={formatAxisDate}
                minTickGap={isMobile ? 26 : 18}
                tickMargin={8}
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickFormatter={formatPlayersAxis}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                width={isMobile ? 40 : 60}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value) => [
                  `${numberFormatter.format(value)} ${translate("spelare", "players")}`,
                  tooltipLabel,
                ]}
              />
              <Bar dataKey="players" fill={activeColor} radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 20 : 28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(148,163,184,0.75)",
            }}
          >
            {translate("Ingen trenddata för valt spel.", "No trend data for the selected game.")}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const AsiaTrackerSection = ({
  overviewLoading,
  overviewError,
  lastUpdatedLabel,
  totalLive,
  liveShare,
  tableRows,
  options,
  selectedSlug,
  onSelectSlug,
  viewMode,
  onChangeViewMode,
  trendChartData,
  trendSummary,
  gameChartData,
  gameSummary,
  selectedOption,
  dayOptions,
  days,
  onChangeDays,
  movingAverageOn,
  onToggleMovingAverage,
  movingAverageDays,
  movingAverageOptions,
  onChangeMovingAverageDays,
  numberFormatter,
  translate,
  percentFormatter,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTrendView = viewMode === "trend";
  const currentSummary = isTrendView ? trendSummary : gameSummary;
  const formatSigned = (value) => {
    if (!Number.isFinite(value)) return "—";
    const abs = numberFormatter.format(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  };

  const changeColor =
    currentSummary && Number.isFinite(currentSummary?.absolute)
      ? currentSummary.absolute >= 0
        ? "#34d399"
        : "#f87171"
      : "rgba(148,163,184,0.75)";
  const percentText =
    currentSummary && Number.isFinite(currentSummary?.percent)
      ? `${currentSummary.percent > 0 ? "+" : ""}${percentFormatter.format(currentSummary.percent)}%`
      : "—";
  const absoluteText =
    currentSummary && Number.isFinite(currentSummary?.absolute) ? formatSigned(currentSummary.absolute) : "—";
  const startText =
    currentSummary?.start?.value != null ? numberFormatter.format(currentSummary.start.value) : "—";
  const endText =
    currentSummary?.end?.value != null ? numberFormatter.format(currentSummary.end.value) : "—";
  const startDateText = formatDateOnly(currentSummary?.start?.date) ?? "—";
  const endDateText = formatDateOnly(currentSummary?.end?.date) ?? "—";

  const activeColor = selectedOption?.color ?? ASIA_AGG_COLOR;
  const activeLabel = selectedOption?.label ?? translate("Välj Asien-spel", "Select Asia game");
  const totalLiveText = Number.isFinite(totalLive) ? numberFormatter.format(totalLive) : "—";
  const shareText =
    Number.isFinite(liveShare) && liveShare != null ? `${percentFormatter.format(liveShare * 100)}%` : "—";
  const movingAverageLabel = translate(
    `Glidande snitt ${movingAverageDays}d`,
    `Moving avg ${movingAverageDays}d`
  );
  const tooltipLabel = movingAverageOn
    ? movingAverageLabel
    : translate("Snitt", "Average");
  const maxXTicks = isMobile ? 4 : 6;

  const asiaTrendTicks = useMemo(() => {
    if (!Array.isArray(trendChartData) || !trendChartData.length) return undefined;
    if (trendChartData.length <= maxXTicks) return trendChartData.map((row) => row.date);
    const step = Math.ceil((trendChartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < trendChartData.length; index += step) {
      ticks.push(trendChartData[index].date);
    }
    const lastDate = trendChartData[trendChartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [trendChartData, maxXTicks]);
  const asiaGameTicks = useMemo(() => {
    if (!Array.isArray(gameChartData) || !gameChartData.length) return undefined;
    if (gameChartData.length <= maxXTicks) return gameChartData.map((row) => row.date);
    const step = Math.ceil((gameChartData.length - 1) / (maxXTicks - 1));
    const ticks = [];
    for (let index = 0; index < gameChartData.length; index += step) {
      ticks.push(gameChartData[index].date);
    }
    const lastDate = gameChartData[gameChartData.length - 1]?.date;
    if (lastDate && ticks[ticks.length - 1] !== lastDate) ticks.push(lastDate);
    return ticks;
  }, [gameChartData, maxXTicks]);

  const formatAxisDate = useCallback(
    (value) => {
      if (!value) return "";
      const text = String(value);
      return isMobile ? text.slice(5) : text;
    },
    [isMobile]
  );

  const formatPlayersAxis = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      if (!isMobile) return numberFormatter.format(value);
      if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
      return numberFormatter.format(value);
    },
    [isMobile, numberFormatter]
  );

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
      }}
    >
      <Stack spacing={0.4} alignItems="center" sx={{ textAlign: "center" }}>
        <Typography variant="overline" sx={{ color: "rgba(248,250,133,0.9)", letterSpacing: 1.4, fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
          {translate("Asia Tracker", "Asia Tracker")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Hämtar Asien-data…", "Fetching Asia data…")
            : lastUpdatedLabel
            ? translate(`Senast uppdaterad ${lastUpdatedLabel}`, `Last updated ${lastUpdatedLabel}`)
            : overviewError || translate("Ingen data för Asien-spel ännu", "No data for Asia games yet")}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" justifyContent="center" sx={{ textAlign: "center" }}>
        <Chip
          label={translate(`Live just nu: ${totalLiveText}`, `Live right now: ${totalLiveText}`)}
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(248,250,133,0.18)",
            color: "#fde68a",
            fontWeight: 600,
          }}
        />
        <Chip
          label={translate(`Andel av livevolym: ${shareText}`, `Share of live volume: ${shareText}`)}
          sx={{
            borderRadius: "999px",
            backgroundColor: "rgba(74,222,128,0.15)",
            color: "#4ade80",
            fontWeight: 600,
          }}
        />
      </Stack>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        size="small"
        onChange={(_, value) => value && onChangeViewMode(value)}
        sx={{
          alignSelf: "center",
          backgroundColor: "rgba(148,163,184,0.12)",
          borderRadius: "999px",
          p: 0.5,
        }}
      >
        <ToggleButton
          value="trend"
          sx={{
            textTransform: "none",
            color: "rgba(226,232,240,0.75)",
            border: 0,
            borderRadius: "999px!important",
            px: { xs: 1.5, md: 2.2 },
            "&.Mui-selected": {
              color: "#f8fafc",
              backgroundColor: "rgba(248,250,133,0.28)",
            },
          }}
        >
          {translate("Asien-trend", "Asia trend")}
        </ToggleButton>
        <ToggleButton
          value="games"
          sx={{
            textTransform: "none",
            color: "rgba(226,232,240,0.75)",
            border: 0,
            borderRadius: "999px!important",
            px: { xs: 1.5, md: 2.2 },
            "&.Mui-selected": {
              color: "#f8fafc",
              backgroundColor: "rgba(56,189,248,0.28)",
            },
          }}
        >
          {translate("Spel", "Games")}
        </ToggleButton>
      </ToggleButtonGroup>

      {!isTrendView && (
        <Stack spacing={1} alignItems="center" sx={{ textAlign: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
          {translate("Välj Asien-spel", "Select Asia game")}
        </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              maxHeight: { xs: 210, md: 120 },
              overflowY: "auto",
              pr: 0.5,
              justifyContent: "center",
            }}
          >
            {options.length ? (
              options.map((option) => {
                const isActive = option.slug === selectedSlug;
                return (
                  <Chip
                    key={option.slug}
                    label={option.label}
                    onClick={() => onSelectSlug && onSelectSlug(option.slug)}
                    clickable
                    sx={{
                      borderRadius: "999px",
                      backgroundColor: isActive ? `${option.color}33` : "rgba(148,163,184,0.1)",
                      color: isActive ? option.color : "rgba(226,232,240,0.8)",
                      border: `1px solid ${isActive ? option.color : "transparent"}`,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                );
              })
            ) : (
              <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
                {translate("Ingen speldata för Asien-portföljen ännu.", "No game data for the Asia portfolio yet.")}
              </Typography>
            )}
          </Box>
        </Stack>
      )}

      {!isTrendView && selectedSlug && (
        <Stack spacing={0.4} alignItems="center" sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: activeColor, fontWeight: 700 }}>
            {activeLabel}
          </Typography>
          {gameSummary && (
            <Typography variant="subtitle2" sx={{ color: changeColor, fontWeight: 600 }}>
              {translate("Förändring", "Change")}: {absoluteText} ({percentText})
              {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
            </Typography>
          )}
        </Stack>
      )}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 0.75, md: 2 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="center"
        sx={{ color: "rgba(148,163,184,0.75)", textAlign: { xs: "left", md: "center" } }}
      >
        <Typography variant="caption">
          {translate("Start", "Start")}: <strong>{startText}</strong> ({startDateText})
        </Typography>
        <Typography variant="caption">
          {translate("Slut", "End")}: <strong>{endText}</strong> ({endDateText})
        </Typography>
        {(isTrendView || !selectedSlug) && (
           <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600 }}>
            {translate("Förändring", "Change")}: {absoluteText} ({percentText})
            {movingAverageOn ? ` ${translate(`• glidande snitt ${movingAverageDays}d`, `• moving avg ${movingAverageDays}d`)}` : ""}
          </Typography>
        )}
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
      >
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
          {translate("Visa dagar", "Show days")}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label={movingAverageOn ? `${movingAverageLabel} (${translate("på", "on")})` : movingAverageLabel}
            onClick={onToggleMovingAverage}
            clickable
            sx={{
              borderRadius: "999px",
              backgroundColor: movingAverageOn ? "rgba(56,189,248,0.2)" : "rgba(148,163,184,0.12)",
              color: movingAverageOn ? "#7dd3fc" : "rgba(226,232,240,0.85)",
              border: movingAverageOn ? "1px solid rgba(56,189,248,0.45)" : "1px solid transparent",
              fontWeight: movingAverageOn ? 700 : 500,
            }}
          />
          {movingAverageOn && (
            <ToggleButtonGroup
              value={movingAverageDays}
              exclusive
              size="small"
              onChange={(_, value) => value && onChangeMovingAverageDays?.(value)}
              sx={{
                backgroundColor: "rgba(56,189,248,0.12)",
                borderRadius: "999px",
                p: 0.5,
              }}
            >
              {(movingAverageOptions || MA_WINDOW_OPTIONS).map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  sx={{
                    textTransform: "none",
                    color: "rgba(226,232,240,0.75)",
                    border: 0,
                    borderRadius: "999px!important",
                    px: { xs: 1.25, md: 1.75 },
                    "&.Mui-selected": {
                      color: "#f8fafc",
                      backgroundColor: "rgba(56,189,248,0.35)",
                    },
                  }}
                >
                  MA {option}d
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup
            value={days}
            exclusive
            size="small"
            onChange={(_, value) => value && onChangeDays(value)}
            sx={{
              backgroundColor: "rgba(148,163,184,0.12)",
              borderRadius: "999px",
              p: 0.5,
            }}
          >
            {dayOptions.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  color: "rgba(226,232,240,0.75)",
                  border: 0,
                  borderRadius: "999px!important",
                  px: { xs: 1.5, md: 2 },
                  "&.Mui-selected": {
                    color: "#f8fafc",
                    backgroundColor: isTrendView ? "rgba(248,250,133,0.28)" : "rgba(56,189,248,0.28)",
                  },
                }}
              >
                {option} d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ height: { xs: 248, md: 260 }, mx: { xs: -1, md: 0 } }}>
        {overviewLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
            <CircularProgress size={20} sx={{ color: isTrendView ? "#fde68a" : "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Laddar spelardata…", "Loading player data…")}
            </Typography>
          </Box>
        ) : isTrendView ? (
          trendChartData.length ? (
            <ResponsiveContainer>
              <AreaChart
                data={trendChartData}
                margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="asiaTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASIA_AGG_COLOR} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={ASIA_AGG_COLOR} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  ticks={asiaTrendTicks}
                  interval={0}
                  tickFormatter={formatAxisDate}
                  minTickGap={isMobile ? 26 : 18}
                  tickMargin={8}
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  tickFormatter={formatPlayersAxis}
                  width={isMobile ? 40 : 60}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(250, 204, 21, 0.25)",
                    borderRadius: 12,
                    color: "#f8fafc",
                  }}
                  formatter={(value) => [
                    `${numberFormatter.format(value)} ${translate("spelare", "players")}`,
                    tooltipLabel,
                  ]}
                />
                <Area
                  dataKey="players"
                  type="monotone"
                  stroke={ASIA_AGG_COLOR}
                  strokeWidth={isMobile ? 2 : 2.2}
                  fill="url(#asiaTrendGradient)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(148,163,184,0.75)",
              }}
            >
              {translate(
                "Ingen sammanlagd trenddata för Asien-portföljen.",
                "No aggregated trend data for the Asia portfolio."
              )}
            </Box>
          )
        ) : gameChartData.length ? (
          <ResponsiveContainer>
            <BarChart
              data={gameChartData}
              margin={isMobile ? { top: 8, right: 8, left: -18, bottom: 0 } : { top: 10, right: 16, left: -10, bottom: 0 }}
              barCategoryGap={isMobile ? "18%" : "22%"}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                ticks={asiaGameTicks}
                interval={0}
                tickFormatter={formatAxisDate}
                minTickGap={isMobile ? 26 : 18}
                tickMargin={8}
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                tickFormatter={formatPlayersAxis}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                width={isMobile ? 40 : 60}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(250, 204, 21, 0.25)",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value) => [
                  `${numberFormatter.format(value)} ${translate("spelare", "players")}`,
                  tooltipLabel,
                ]}
              />
              <Bar dataKey="players" fill={activeColor} radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 20 : 28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(148,163,184,0.75)",
            }}
          >
            {translate("Ingen trenddata för valt spel.", "No trend data for the selected game.")}
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.15)" }} />

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
          {translate("Nyckeltal per spel", "Key metrics per game")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)" }}>
          {translate(
            "Live just nu vs snitt spelare (30–90 d) för utvalda Asien-spel.",
            "Live right now vs average players (30–90 d) for selected Asia games."
          )}
        </Typography>
        <Stack spacing={1}>
          {tableRows.length ? (
            tableRows.map((row) => (
              <Box
                key={row.slug}
                sx={{
                  background: "rgba(15,23,42,0.55)",
                  borderRadius: "12px",
                  border: `1px solid ${row.color}44`,
                  p: 1.25,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
                    <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                      {row.label}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                        {translate("Live", "Live")}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
                        {row.livePlayers != null ? numberFormatter.format(row.livePlayers) : "—"}
                      </Typography>
                    </Stack>
                    <Stack spacing={0} alignItems="flex-end">
                      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                        {translate("Snitt", "Average")}
                      </Typography>
                      <Typography sx={{ color: "#fde68a", fontWeight: 600 }}>
                        {row.avgPlayers != null ? numberFormatter.format(row.avgPlayers) : "—"}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            ))
          ) : (
            <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
              {translate("Ingen översikt tillgänglig för dessa spel ännu.", "No overview available for these games yet.")}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

const RankingSection = ({ rankingRows, overviewLoading, numberFormatter, translate }) => (
  <Box
    sx={{
      background: "rgba(15,23,42,0.45)",
      borderRadius: "16px",
      border: "1px solid rgba(148,163,184,0.18)",
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
    }}
  >
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
      <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
        {translate("Ranking", "Ranking")}
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
        {overviewLoading
          ? translate("Uppdaterar ranking…", "Updating ranking…")
          : translate(`${rankingRows.length} spel listade`, `${rankingRows.length} games listed`)}
      </Typography>
    </Stack>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {rankingRows.map((row, index) => (
        <Stack
          key={row.slug}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            background: "rgba(15,23,42,0.55)",
            borderRadius: "12px",
            border: `1px solid ${row.color}33`,
            padding: "12px 16px",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
            <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
              #{index + 1} {row.label}
            </Typography>
          </Stack>
          <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
            {numberFormatter.format(row.avgPlayers)}
          </Typography>
        </Stack>
      ))}
      {rankingRows.length === 0 && (
        <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
          {translate("Ingen rankingdata tillgänglig.", "No ranking data available.")}
        </Typography>
      )}
    </Box>
  </Box>
);

const AthSection = ({
  athRows,
  athDays,
  onChangeDays,
  overviewLoading,
  overviewError,
  showAllAth,
  toggleShowAll,
  numberFormatter,
  translate,
}) => {
  const visibleRows = useMemo(() => (showAllAth ? athRows : athRows.slice(0, INITIAL_VISIBLE_ATH)), [athRows, showAllAth]);
  const isLoading = overviewLoading && athRows.length === 0;
  const showError = Boolean(overviewError) && athRows.length === 0;
  const isEmpty = athRows.length === 0 && !isLoading && !showError;

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
      >
        <Stack spacing={0.4}>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
            {translate("All-Time High (ATH) & Senaste", "All-Time High (ATH) & Latest")}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
            {isLoading
              ? translate("Hämtar toppdata…", "Fetching peak data…")
              : showError
              ? translate(`Fel: ${overviewError}`, `Error: ${overviewError}`)
              : athRows.length
              ? translate(
                  `Topplista baserad på de senaste ${athDays} dagarna`,
                  `Leaderboard based on the past ${athDays} days`
                )
              : translate("Ingen toppdata tillgänglig ännu.", "No peak data available yet.")}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          value={athDays}
          exclusive
          onChange={(_, value) => value && onChangeDays(value)}
          size="small"
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
          }}
        >
          {ATH_DAY_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.75)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.5, md: 2 },
                "&.Mui-selected": {
                  color: "#f8fafc",
                  backgroundColor: "rgba(192,132,252,0.28)",
                },
              }}
            >
              {option} d
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3, gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#c084fc" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            {translate("Hämtar toppdata…", "Fetching peak data…")}
          </Typography>
        </Box>
      ) : showError ? (
        <Typography sx={{ color: "#fecaca" }}>
          {translate(`Fel: ${overviewError}`, `Error: ${overviewError}`)}
        </Typography>
      ) : isEmpty ? (
        <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
          {translate("Ingen ATH-data tillgänglig.", "No ATH data available.")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {visibleRows.map((row, index) => (
            <Box
              key={row.slug}
              sx={{
                background: "rgba(15,23,42,0.55)",
                borderRadius: "12px",
                border: `1px solid ${row.color}55`,
                p: 1.25,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
                  <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                    #{index + 1} {row.label}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      {translate("ATH", "ATH")}
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.ath?.value != null ? numberFormatter.format(row.ath.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.ath?.at ? formatDateTime(row.ath.at) : ""}
                    </Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(148,163,184,0.2)" }} />
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      {translate("Senaste", "Latest")}
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.latest?.value != null ? numberFormatter.format(row.latest.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.latest?.at ? formatDateTime(row.latest.at) : ""}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          ))}

          {athRows.length > visibleRows.length && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <Chip
                label={showAllAth ? translate("Visa mindre", "Show less") : translate("Visa fler", "Show more")}
                onClick={toggleShowAll}
                clickable
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  color: "#cbd5f5",
                  borderRadius: "999px",
                }}
              />
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default LivePlayersControlPanel;
