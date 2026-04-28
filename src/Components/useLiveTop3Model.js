"use client";

// Handles fetching, caching, and derived state for the live top-3 wins view.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getGameColor } from "@/config/games";

export const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
export const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // hourly refresh is enough
export const HISTORY_DAYS = 30;
export const HISTORY_PER_DAY = 3;
export const HISTORY_ARCHIVE_VISIBLE_LIMIT = 5;
export const LIVE_TOP3_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const NUMBER_LOCALE_MAP = { sv: "sv-SE", en: "en-US" };
export const TODAY_VISIBLE_LIMIT = 6;
export const BOLT_ICON_COLOR = "#fef08a";

const MULTIPLIER_STYLES = [
  {
    limit: 500,
    color: "#ccfbf1",
    background: "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(6,182,212,0.35))",
    border: "rgba(13,148,136,0.5)",
    shadow: "0 0 18px rgba(13,148,136,0.35)",
  },
  {
    limit: 1000,
    color: "#f3e8ff",
    background: "linear-gradient(135deg, rgba(109,40,217,0.45), rgba(192,132,252,0.4))",
    border: "rgba(147,51,234,0.55)",
    shadow: "0 0 20px rgba(147,51,234,0.35)",
  },
  {
    limit: 1500,
    color: "#fee2e2",
    background: "linear-gradient(135deg, rgba(220,38,38,0.4), rgba(248,113,113,0.35))",
    border: "rgba(248,113,113,0.55)",
    shadow: "0 0 18px rgba(220,38,38,0.3)",
  },
  {
    limit: 2000,
    color: "#ffedd5",
    background: "linear-gradient(135deg, rgba(251,146,60,0.4), rgba(249,115,22,0.35))",
    border: "rgba(251,146,60,0.55)",
    shadow: "0 0 18px rgba(251,146,60,0.35)",
  },
  {
    limit: 2500,
    color: "#fef9c3",
    background: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(251,191,36,0.35))",
    border: "rgba(245,158,11,0.55)",
    shadow: "0 0 18px rgba(245,158,11,0.35)",
  },
  {
    limit: 3000,
    color: "#ffe4e6",
    background: "linear-gradient(135deg, rgba(244,63,94,0.4), rgba(251,113,133,0.35))",
    border: "rgba(244,63,94,0.5)",
    shadow: "0 0 18px rgba(244,63,94,0.3)",
  },
  {
    limit: 3500,
    color: "#ede9fe",
    background: "linear-gradient(135deg, rgba(125,211,252,0.35), rgba(192,132,252,0.4))",
    border: "rgba(96,165,250,0.5)",
    shadow: "0 0 18px rgba(96,165,250,0.3)",
  },
  {
    limit: 4000,
    color: "#dbeafe",
    background: "linear-gradient(135deg, rgba(37,99,235,0.4), rgba(14,165,233,0.35))",
    border: "rgba(37,99,235,0.5)",
    shadow: "0 0 18px rgba(37,99,235,0.35)",
  },
  {
    limit: 4500,
    color: "#d9f99d",
    background: "linear-gradient(135deg, rgba(101,163,13,0.35), rgba(34,197,94,0.35))",
    border: "rgba(101,163,13,0.5)",
    shadow: "0 0 18px rgba(101,163,13,0.3)",
  },
  {
    limit: 5000,
    color: "#e0f2fe",
    background: "linear-gradient(135deg, rgba(8,145,178,0.4), rgba(14,165,233,0.35))",
    border: "rgba(8,145,178,0.55)",
    shadow: "0 0 18px rgba(8,145,178,0.35)",
  },
];

const stockholmDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

let liveTop3Cache = {
  payload: null,
  expiresAt: 0,
};

const getStockholmTodayYmd = () => {
  try {
    return stockholmDateFormatter.format(new Date()).replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const getMultiplierStyle = (value) => {
  if (!Number.isFinite(value)) {
    return {
      color: "#f8fafc",
      background: "linear-gradient(135deg, rgba(148,163,184,0.25), rgba(71,85,105,0.25))",
      border: "rgba(148,163,184,0.4)",
      shadow: "0 0 12px rgba(100,116,139,0.25)",
    };
  }
  const match = MULTIPLIER_STYLES.find((entry) => value <= entry.limit);
  return match ?? MULTIPLIER_STYLES[MULTIPLIER_STYLES.length - 1];
};

const parseEntryTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
};

const parseEntryAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const compareEntriesByAmountThenTime = (a, b) => {
  const amountDiff = parseEntryAmount(b?.totalAmount) - parseEntryAmount(a?.totalAmount);
  if (amountDiff !== 0) return amountDiff;
  return (
    parseEntryTimestamp(b?.settledAt ?? b?.fetchedAt) -
    parseEntryTimestamp(a?.settledAt ?? a?.fetchedAt)
  );
};

const compareEntriesBySettledTimeDesc = (a, b) => {
  return (
    parseEntryTimestamp(b?.settledAt ?? b?.startedAt ?? b?.fetchedAt) -
    parseEntryTimestamp(a?.settledAt ?? a?.startedAt ?? a?.fetchedAt)
  );
};

const normalizeEntries = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const winnersCountValue =
        item?.winnersCount ?? item?.totalWinners ?? (Array.isArray(item?.winners) ? item.winners.length : null);

      return {
        id:
          item?.id ??
          item?.gameShowEventId ??
          item?.settledAt ??
          item?.startedAt ??
          `${item?.gameShow ?? "game"}-${item?.multiplier ?? "x"}-${Math.random().toString(36).slice(2)}`,
        gameShow: item?.gameShow ?? "",
        multiplier: Number(item?.multiplier),
        totalAmount: Number(item?.totalAmount),
        settledAt: item?.settledAt ?? item?.startedAt ?? null,
        winnersCount: Number.isFinite(Number(winnersCountValue)) ? Number(winnersCountValue) : null,
      };
    })
    .filter((entry) => entry.gameShow && Number.isFinite(entry.totalAmount))
    .sort(compareEntriesByAmountThenTime);
};

export const formatAmount = (value, locale) => {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString(locale, {
    maximumFractionDigits: value >= 10_000 ? 0 : 1,
    minimumFractionDigits: value >= 10_000 ? 0 : 1,
  })} €`;
};

export const formatGameName = (slug) =>
  slug
    ?.toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") ?? "—";

export const formatSettledLabel = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toLocaleString(locale === "en" ? "en-GB" : "sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getColorForGameSlug = (slug) => {
  if (!slug || typeof slug !== "string") return "#94a3b8";
  const normalized = slug.toLowerCase().replace(/_/g, "-");
  return getGameColor(normalized);
};

const buildEntryKey = (entry = {}) =>
  entry?.id ??
  [
    entry?.gameShow ?? "game",
    entry?.settledAt ?? entry?.startedAt ?? entry?.createdAt ?? "",
    entry?.multiplier ?? "",
    entry?.totalAmount ?? "",
  ].join("|");

const dedupeEntriesFromSnapshots = (snapshots = []) => {
  const seen = new Set();
  const dayEntries = [];
  snapshots.forEach((snapshot) => {
    const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = buildEntryKey(entry);
      if (seen.has(key)) return;
      seen.add(key);
      dayEntries.push({
        ...entry,
        fetchedAt: snapshot?.fetchedAt ?? entry?.fetchedAt ?? null,
      });
    });
  });
  dayEntries.sort(compareEntriesByAmountThenTime);
  return dayEntries;
};

export function useLiveTop3Model({ locale }) {
  const numberLocale = NUMBER_LOCALE_MAP[locale] ?? NUMBER_LOCALE_MAP.sv;
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading");
  const [meta, setMeta] = useState({ fetchedAt: null, source: null });
  const [historyBuckets, setHistoryBuckets] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [showAllTodayEntries, setShowAllTodayEntries] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [expandedDays, setExpandedDays] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    const applyPayload = (payload) => {
      if (!payload) return;
      const normalized = normalizeEntries(payload?.todayEntries ?? payload?.entries ?? payload);
      if (!active) return;
      setEntries(normalized);
      setMeta((prev) => {
        const nextFetched = payload?.fetchedAt ?? payload?.updatedAt ?? null;
        const prevMs = prev?.fetchedAt ? Date.parse(prev.fetchedAt) : 0;
        const nextMs = nextFetched ? Date.parse(nextFetched) : NaN;
        const useFetched =
          Number.isFinite(nextMs) && nextMs > prevMs
            ? nextFetched
            : prev?.fetchedAt ?? nextFetched ?? null;
        return {
          fetchedAt: useFetched,
          source: payload?.source ?? prev?.source ?? null,
          todayYmd: payload?.todayYmd ?? prev?.todayYmd ?? null,
        };
      });
      setHistoryBuckets(Array.isArray(payload?.history) ? payload.history : []);
      setStatus("success");
    };

    const maybeUseCache = () => {
      if (liveTop3Cache.payload && liveTop3Cache.expiresAt > Date.now()) {
        applyPayload(liveTop3Cache.payload);
        return true;
      }
      return false;
    };

    const fetchTopWins = async () => {
      try {
        const params = new URLSearchParams({
          historyDays: String(HISTORY_DAYS),
          historyPerDay: String(HISTORY_PER_DAY),
        });
        const response = await fetch(`${LIVE_TOP3_ENDPOINT}?${params.toString()}`);
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        const payload = await response.json();
        liveTop3Cache = {
          payload,
          expiresAt: Date.now() + LIVE_TOP3_CACHE_TTL,
        };
        applyPayload(payload);
      } catch {
        if (!active) return;
        setStatus((prev) => (prev === "success" ? prev : "error"));
      }
    };

    const usedCache = maybeUseCache();
    if (!usedCache) {
      fetchTopWins();
    }
    const id = setInterval(fetchTopWins, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const isLoading = status === "loading" && entries.length === 0;
  const showError = status === "error" && entries.length === 0;
  const lastUpdatedLabel = meta?.fetchedAt
    ? new Date(meta.fetchedAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const historyDayEntries = useMemo(() => {
    return (historyBuckets || []).map((bucket) => ({
      ymd: bucket?.ymd ?? null,
      entries: dedupeEntriesFromSnapshots(bucket?.snapshots ?? []),
    }));
  }, [historyBuckets]);

  const allEntries = useMemo(() => {
    const seen = new Set();
    const combined = [];
    const pushUnique = (entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = buildEntryKey(entry);
      if (seen.has(key)) return;
      seen.add(key);
      combined.push(entry);
    };
    entries.forEach(pushUnique);
    historyDayEntries.forEach((bucket) => {
      (bucket?.entries ?? []).forEach(pushUnique);
    });
    return combined;
  }, [entries, historyDayEntries]);

  const chronologicalEntries = useMemo(
    () => entries.slice().sort(compareEntriesBySettledTimeDesc),
    [entries]
  );

  const summaryStats = useMemo(() => {
    const totals = entries.reduce(
      (acc, entry) => {
        const amount = parseEntryAmount(entry?.totalAmount);
        acc.totalAmount += amount;
        if (entry?.gameShow) {
          acc.uniqueGames.add(entry.gameShow);
        }
        if (amount > acc.maxAmount) {
          acc.maxAmount = amount;
          acc.maxEntry = entry;
        }
        if (Number.isFinite(entry?.winnersCount)) {
          acc.totalWinners += entry.winnersCount;
        }
        return acc;
      },
      { totalAmount: 0, maxAmount: 0, maxEntry: null, uniqueGames: new Set(), totalWinners: 0 }
    );
    return {
      totalAmount: totals.totalAmount,
      winsCount: entries.length,
      avgAmount: entries.length ? totals.totalAmount / entries.length : 0,
      biggestEntry: totals.maxEntry,
      uniqueGamesCount: totals.uniqueGames.size,
      totalWinners: totals.totalWinners,
      latestEntry: chronologicalEntries[0] ?? null,
    };
  }, [entries, chronologicalEntries]);

  const entriesByGame = useMemo(() => {
    const map = new Map();
    allEntries.forEach((entry) => {
      const key = entry?.gameShow;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(entry);
    });
    map.forEach((list) => {
      list.sort(compareEntriesByAmountThenTime);
    });
    return map;
  }, [allEntries]);

  const gameOptions = useMemo(() => {
    return Array.from(entriesByGame.entries())
      .map(([gameShow, list]) => ({
        id: gameShow,
        gameShow,
        displayName: formatGameName(gameShow),
        winsCount: list.length,
        topAmount: parseEntryAmount(list[0]?.totalAmount),
        color: getColorForGameSlug(gameShow),
      }))
      .sort((a, b) => b.topAmount - a.topAmount || a.displayName.localeCompare(b.displayName));
  }, [entriesByGame]);

  const filteredHistoryDays = useMemo(() => {
    const todayYmd = meta?.todayYmd ?? getStockholmTodayYmd();
    return historyDayEntries
      .filter((bucket) => {
        if (!bucket?.ymd || !Array.isArray(bucket.entries)) return false;
        if (!bucket.entries.length) return false;
        return bucket.ymd !== todayYmd;
      })
      .slice()
      .sort((a, b) => (b.ymd ?? "").localeCompare(a.ymd ?? ""));
  }, [historyDayEntries, meta?.todayYmd]);

  const chartDayOptions = useMemo(() => {
    const todayYmd = meta?.todayYmd ?? getStockholmTodayYmd();
    const options = [];
    if (entries.length) {
      options.push({
        id: todayYmd,
        ymd: todayYmd,
        entries,
        isToday: true,
      });
    }
    const historical = historyDayEntries
      .filter((bucket) => bucket?.ymd && bucket.ymd !== todayYmd && bucket.entries?.length)
      .slice()
      .sort((a, b) => (b.ymd ?? "").localeCompare(a.ymd ?? ""));
    historical.forEach((bucket) => {
      options.push({ id: bucket.ymd, ymd: bucket.ymd, entries: bucket.entries, isToday: false });
    });
    return options;
  }, [entries, historyDayEntries, meta?.todayYmd]);

  const visibleTodayEntries = useMemo(
    () =>
      showAllTodayEntries
        ? chronologicalEntries
        : chronologicalEntries.slice(0, TODAY_VISIBLE_LIMIT),
    [chronologicalEntries, showAllTodayEntries]
  );
  const canExpandTodayList = chronologicalEntries.length > TODAY_VISIBLE_LIMIT;

  const toggleDayExpanded = useCallback((ymd) => {
    if (!ymd) return;
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(ymd)) {
        next.delete(ymd);
      } else {
        next.add(ymd);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeTab !== "today" && showAllTodayEntries) {
      setShowAllTodayEntries(false);
    }
  }, [activeTab, showAllTodayEntries]);

  useEffect(() => {
    if (!gameOptions.length) {
      if (selectedGame !== null) {
        setSelectedGame(null);
      }
      return;
    }
    if (!selectedGame || !entriesByGame.has(selectedGame)) {
      const next = gameOptions[0]?.gameShow ?? null;
      if (next !== selectedGame) {
        setSelectedGame(next);
      }
    }
  }, [gameOptions, entriesByGame, selectedGame]);

  return {
    numberLocale,
    entries,
    status,
    meta,
    historyBuckets,
    activeTab,
    setActiveTab,
    showAllTodayEntries,
    setShowAllTodayEntries,
    selectedGame,
    setSelectedGame,
    expandedDays,
    toggleDayExpanded,
    isLoading,
    showError,
    lastUpdatedLabel,
    historyDayEntries,
    allEntries,
    chronologicalEntries,
    summaryStats,
    entriesByGame,
    gameOptions,
    filteredHistoryDays,
    chartDayOptions,
    visibleTodayEntries,
    canExpandTodayList,
  };
}
