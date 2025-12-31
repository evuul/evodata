"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import LiveTop3PayoutChart from "./LiveTop3PayoutChart";
import { getGameColor } from "@/config/games";

const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // hourly refresh is enough
const HISTORY_DAYS = 30;
const HISTORY_PER_DAY = 3;
const HISTORY_ARCHIVE_VISIBLE_LIMIT = 5;
const LIVE_TOP3_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const NUMBER_LOCALE_MAP = { sv: "sv-SE", en: "en-US" };
const TODAY_VISIBLE_LIMIT = 6;
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
const BOLT_ICON_COLOR = "#fef08a";
let liveTop3Cache = {
  payload: null,
  expiresAt: 0,
};

const stockholmDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getStockholmTodayYmd = () => {
  try {
    return stockholmDateFormatter.format(new Date()).replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};
const getMultiplierStyle = (value) => {
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

const formatAmount = (value, locale) => {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString(locale, {
    maximumFractionDigits: value >= 10_000 ? 0 : 1,
    minimumFractionDigits: value >= 10_000 ? 0 : 1,
  })} €`;
};

const formatGameName = (slug) =>
  slug
    ?.toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") ?? "—";

const formatSettledLabel = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toLocaleString(locale === "en" ? "en-GB" : "sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const rankStyles = [
  {
    background: "linear-gradient(135deg, rgba(253,224,71,0.35), rgba(248,113,113,0.45))",
    color: "#fef9c3",
  },
  {
    background: "linear-gradient(135deg, rgba(96,165,250,0.3), rgba(14,165,233,0.45))",
    color: "#dbeafe",
  },
  {
    background: "linear-gradient(135deg, rgba(129,140,248,0.35), rgba(192,132,252,0.45))",
    color: "#ede9fe",
  },
];

const getColorForGameSlug = (slug) => {
  if (!slug || typeof slug !== "string") return "#94a3b8";
  const normalized = slug.toLowerCase().replace(/_/g, "-");
  return getGameColor(normalized);
};

const EntryCard = ({ entry, rank, numberLocale, locale, translate }) => {
  const settledCopy = formatSettledLabel(entry.settledAt, locale);
  const multiplierStyle = getMultiplierStyle(entry.multiplier);
  const badgeStyle = rankStyles[rank] ?? {
    background: "linear-gradient(135deg, rgba(51,65,85,0.55), rgba(30,41,59,0.75))",
    color: "#e2e8f0",
  };
  const topWinnerName =
    entry.topWinner?.name ??
    (locale === "en" ? "Unknown player" : "Okänd spelare");

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,64,175,0.55))",
        borderRadius: 2.5,
        border: "1px solid rgba(59,130,246,0.35)",
        boxShadow: "0 12px 24px rgba(2,6,23,0.45)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.22), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, position: "relative", p: 2.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              background: badgeStyle.background,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: badgeStyle.color,
              fontWeight: 700,
              fontSize: "1.1rem",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 6px 16px rgba(15,23,42,0.5)",
            }}
          >
            #{rank + 1}
          </Box>
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1.4, fontWeight: 600 }}>
              {translate("Liveshow", "Live show")}
            </Typography>
            <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
              {formatGameName(entry.gameShow)}
            </Typography>
          </Box>
          <Chip
            icon={<BoltIcon sx={{ fontSize: "1rem" }} />}
            label={`${Number.isFinite(entry.multiplier) ? entry.multiplier : "—"}×`}
            size="small"
            sx={{
              color: multiplierStyle.color,
              background: multiplierStyle.background,
              border: `1px solid ${multiplierStyle.border}`,
              boxShadow: multiplierStyle.shadow,
              fontWeight: 600,
              "& .MuiChip-icon": {
                color: BOLT_ICON_COLOR,
              },
            }}
          />
        </Stack>

        <Box>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.9rem", mb: 0.5 }}>
            {translate("Total utbetalning", "Total payout")}
          </Typography>
          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 800, letterSpacing: 0.5 }}>
            {formatAmount(entry.totalAmount, numberLocale)}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          sx={{
            borderTop: "1px solid rgba(148,163,184,0.2)",
            pt: 1.5,
            rowGap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)", textTransform: "uppercase" }}>
              {translate("Vinnare", "Winners")}
            </Typography>
            <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>
              {Number.isFinite(entry.winnersCount)
                ? translate(
                    `${entry.winnersCount.toLocaleString(numberLocale)} spelare`,
                    `${entry.winnersCount.toLocaleString(numberLocale)} players`
                  )
                : "—"}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)", textTransform: "uppercase" }}>
              {translate("Senaste", "Last settled")}
            </Typography>
            <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>
              {settledCopy
                ? translate(`Kl ${settledCopy}`, `${settledCopy}`)
                : translate("Pågår", "In progress")}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
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

const LiveTop3 = ({ variant = "standalone" }) => {
  const translate = useTranslate();
  const { locale } = useLocale();
  const numberLocale = NUMBER_LOCALE_MAP[locale] ?? NUMBER_LOCALE_MAP.sv;
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading");
  const [meta, setMeta] = useState({ fetchedAt: null, source: null });
  const [historyBuckets, setHistoryBuckets] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [showAllTodayEntries, setShowAllTodayEntries] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    let active = true;

    const applyPayload = (payload) => {
      if (!payload) return;
      const normalized = normalizeEntries(payload?.todayEntries ?? payload?.entries ?? payload);
      if (!active) return;
      setEntries(normalized);
      setMeta({
        fetchedAt: payload?.fetchedAt ?? payload?.updatedAt ?? null,
        source: payload?.source ?? null,
        todayYmd: payload?.todayYmd ?? null,
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

  const isStandalone = variant !== "embedded";
  const [expandedDays, setExpandedDays] = useState(() => new Set());

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

  const biggestEntry = summaryStats.biggestEntry;
  const biggestSettledCopy = formatSettledLabel(biggestEntry?.settledAt, locale);
  const summaryCardItems = [
    {
      id: "total",
      label: translate("Totalt utbetalt idag", "Total payout today"),
      value: formatAmount(summaryStats.totalAmount, numberLocale),
      helper: summaryStats.winsCount
        ? translate(
            `${summaryStats.winsCount.toLocaleString(numberLocale)} vinster`,
            `${summaryStats.winsCount.toLocaleString(numberLocale)} wins`
          )
        : translate("Inga vinster registrerade", "No wins recorded"),
    },
    {
      id: "biggest",
      label: translate("Största vinst", "Biggest win"),
      value: formatAmount(biggestEntry?.totalAmount, numberLocale),
      helper: biggestEntry
        ? translate(
            `${formatGameName(biggestEntry.gameShow)} · ${
              biggestSettledCopy ? `Kl ${biggestSettledCopy}` : "Pågår"
            }`,
            `${formatGameName(biggestEntry.gameShow)} · ${biggestSettledCopy ?? "Live"}`
          )
        : translate("Avvaktar data", "Awaiting data"),
    },
    {
      id: "count",
      label: translate("Antal vinster", "Number of wins"),
      value: summaryStats.winsCount.toLocaleString(numberLocale),
      helper: summaryStats.winsCount
        ? translate(
            `Snitt ${formatAmount(summaryStats.avgAmount, numberLocale)}`,
            `Avg ${formatAmount(summaryStats.avgAmount, numberLocale)}`
          )
        : translate("Snitt saknas", "Average unavailable"),
    },
    {
      id: "games",
      label: translate("Spel med vinster", "Games with wins"),
      value: summaryStats.uniqueGamesCount.toLocaleString(numberLocale),
      helper: summaryStats.totalWinners
        ? translate(
            `Unika spel med vinster · ${summaryStats.totalWinners.toLocaleString(numberLocale)} vinnare`,
            `Unique games with wins · ${summaryStats.totalWinners.toLocaleString(numberLocale)} winners`
          )
        : translate(
            "Unika spel med vinster · vinnare ej rapporterade",
            "Unique games with wins · winners not reported"
          ),
    },
  ];

  const perGameSelectorLabel = translate("Välj spel", "Select game");

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

  const tabOptions = useMemo(
    () => [
      { value: "today", label: translate("Dagens läge", "Today's view") },
      { value: "history", label: translate("Historik", "History") },
      { value: "perGame", label: translate("Vinster per spel", "Wins per game") },
      { value: "chart", label: translate("Payout-graf", "Payout chart") },
    ],
    [translate]
  );

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

  return (
    <Box
      sx={{
        mt: isStandalone ? { xs: 3, sm: 4 } : 0,
        mb: isStandalone ? { xs: 3, sm: 4 } : 0,
        maxWidth: isStandalone ? 1100 : "100%",
        mx: "auto",
        p: isStandalone ? { xs: 2.5, sm: 3 } : { xs: 2, sm: 2.5 },
        borderRadius: isStandalone ? 3 : 2.5,
        background: isStandalone
          ? "linear-gradient(120deg, rgba(2,6,23,0.85), rgba(30,64,175,0.35))"
          : "rgba(15,23,42,0.65)",
        border: isStandalone ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(59,130,246,0.2)",
        boxShadow: isStandalone ? "0 25px 45px rgba(2,6,23,0.55)" : "0 15px 30px rgba(2,6,23,0.35)",
      }}
    >
      <Stack
        direction="column"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        sx={{ mb: 2.5, textAlign: "center" }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700, textTransform: "uppercase" }}>
            {translate("Live vinster & utbetalningar", "Live wins & payouts")}
          </Typography>
        </Box>
        <Chip
          icon={<MilitaryTechIcon sx={{ fontSize: "1.1rem" }} />}
          label={translate("Direktdata · Live-feed", "Live feed · internal")}
          sx={{
            color: "#e0f2fe",
            borderColor: "rgba(191,219,254,0.35)",
            background: "linear-gradient(135deg, rgba(15,23,42,0.75), rgba(37,99,235,0.4))",
            borderWidth: 1,
            fontWeight: 600,
          }}
        />
        {lastUpdatedLabel && (
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.85)" }}>
            {translate(`Senast uppdaterad ${lastUpdatedLabel}`, `Last updated ${lastUpdatedLabel}`)}
          </Typography>
        )}
        {meta?.todayYmd && (
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
            {translate(`Dagens vinster (${meta.todayYmd})`, `Today's wins (${meta.todayYmd})`)}
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          height: 1,
          width: "100%",
          background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent)",
          mb: 2.5,
        }}
      />

      <Box sx={{ width: "100%", mt: 2 }}>
        {isSmallScreen ? (
          <FormControl fullWidth>
            <InputLabel
              id="live-top3-tab-select-label"
              sx={{
                color: "#cbd5f5",
                "&.Mui-focused": { color: "#38bdf8" },
              }}
            >
              {translate("Välj vy", "Select view")}
            </InputLabel>
            <Select
              labelId="live-top3-tab-select-label"
              label={translate("Välj vy", "Select view")}
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value)}
              sx={{
                borderRadius: 2,
                color: "#e2e8f0",
                "& .MuiSvgIcon-root": { color: "#e2e8f0" },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                  },
                },
              }}
            >
              {tabOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            centered
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#38bdf8" } }}
            sx={{
              "& .MuiTab-root": {
                color: "rgba(226,232,240,0.6)",
                textTransform: "none",
                fontWeight: 600,
              },
              "& .Mui-selected": {
                color: "#f8fafc",
              },
            }}
          >
            {tabOptions.map((option) => (
              <Tab key={option.value} value={option.value} label={option.label} />
            ))}
          </Tabs>
        )}
      </Box>

      {activeTab === "today" && (
        <>
          <Grid container spacing={2} justifyContent="center">
            {summaryCardItems.map((item) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                key={item.id}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <Card
                  sx={{
                    width: "100%",
                    maxWidth: 260,
                    background: "linear-gradient(135deg, rgba(30,41,59,0.85), rgba(59,130,246,0.25))",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  <CardContent>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700, mt: 0.5 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.9)", mt: 0.5 }}>
                      {item.helper}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {isLoading &&
              Array.from({ length: TODAY_VISIBLE_LIMIT }).map((_, index) => (
                <Skeleton
                  key={`today-skeleton-${index}`}
                  variant="rounded"
                  height={90}
                  sx={{ backgroundColor: "rgba(15,23,42,0.5)" }}
                />
              ))}

            {!isLoading &&
              visibleTodayEntries.map((entry, index) => {
                const settledCopy = formatSettledLabel(entry.settledAt, locale);
                const multiplierStyle = getMultiplierStyle(entry.multiplier);
                const winnersCopy = Number.isFinite(entry.winnersCount)
                  ? translate(
                      `${entry.winnersCount.toLocaleString(numberLocale)} vinnare`,
                      `${entry.winnersCount.toLocaleString(numberLocale)} winners`
                    )
                  : translate("Okänt antal vinnare", "Unknown number of winners");

                return (
                  <Card
                    key={entry.id ?? `today-${index}`}
                    sx={{
                      background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(37,99,235,0.35))",
                      border: "1px solid rgba(59,130,246,0.25)",
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Box>
                          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1 }}>
                            {translate("Spel", "Game")}
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {formatGameName(entry.gameShow)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
                            {translate("Vinst", "Win")}
                          </Typography>
                          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {formatAmount(entry.totalAmount, numberLocale)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: "1rem" }} />}
                          label={`${Number.isFinite(entry.multiplier) ? entry.multiplier : "—"}×`}
                          size="small"
                          sx={{
                            color: multiplierStyle.color,
                            background: multiplierStyle.background,
                            border: `1px solid ${multiplierStyle.border}`,
                            boxShadow: multiplierStyle.shadow,
                            fontWeight: 600,
                            "& .MuiChip-icon": {
                              color: BOLT_ICON_COLOR,
                            },
                          }}
                        />
                        <Typography sx={{ color: "#e2e8f0", fontWeight: 500 }}>
                          {settledCopy
                            ? translate(`Kl ${settledCopy}`, `${settledCopy}`)
                            : translate("Pågår", "In progress")}
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", fontWeight: 500 }}>{winnersCopy}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </Stack>

          {canExpandTodayList && !isLoading && (
            <Button
              onClick={() => setShowAllTodayEntries((prev) => !prev)}
              sx={{
                mt: 2,
                color: "#38bdf8",
                fontWeight: 600,
                textTransform: "none",
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {showAllTodayEntries
                ? translate("Visa färre rader", "Show fewer rows")
                : translate("Visa alla vinster", "Show all wins")}
            </Button>
          )}

          {showError && (
            <Card
              sx={{
                backgroundColor: "rgba(153,27,27,0.15)",
                border: "1px solid rgba(248,113,113,0.35)",
                mt: 2,
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: "#fecaca" }}>
                  {translate(
                    "Kunde inte hämta live-topplistan just nu. Försök igen om en liten stund.",
                    "We could not reach the live leaderboard right now. Please try again in a bit."
                  )}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "history" && (
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: "1px solid rgba(148,163,184,0.25)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.5, fontWeight: 600 }}
          >
            {translate("Historiska vinster", "Historic wins")}
          </Typography>
          <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>
            {translate(
              `Arkiv senaste ${HISTORY_DAYS} dagar`,
              `Archive last ${HISTORY_DAYS} days`
            )}
          </Typography>

          {filteredHistoryDays.length === 0 ? (
            <Typography sx={{ color: "#e2e8f0", mt: 2 }}>
              {translate("Ingen historik att visa ännu.", "No history to display yet.")}
            </Typography>
          ) : (
            <Stack spacing={3} sx={{ mt: 3 }}>
              {filteredHistoryDays.map((bucket) => {
                const dayEntries = bucket.entries;
                if (!dayEntries.length) return null;
                const isExpanded = expandedDays.has(bucket.ymd);
                const visibleEntries = isExpanded ? dayEntries : dayEntries.slice(0, HISTORY_ARCHIVE_VISIBLE_LIMIT);
                const canToggle = dayEntries.length > HISTORY_ARCHIVE_VISIBLE_LIMIT;
                const formattedDate = new Date(bucket.ymd).toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Box key={bucket.ymd}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: "#e2e8f0",
                        fontWeight: 600,
                        mb: 1.5,
                        textAlign: "center",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {formattedDate}
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{
                        justifyContent: "center",
                      }}
                    >
                      {visibleEntries.map((entry, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={`${bucket.ymd}-${entry.id}-${idx}`}>
                          <EntryCard
                            entry={entry}
                            rank={idx}
                            numberLocale={numberLocale}
                            locale={locale}
                            translate={translate}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    {canToggle && (
                      <Button
                        onClick={() => toggleDayExpanded(bucket.ymd)}
                        sx={{
                          mt: 2,
                          color: "#38bdf8",
                          fontWeight: 600,
                          textTransform: "none",
                          width: { xs: "100%", sm: "auto" },
                        }}
                      >
                        {isExpanded
                          ? translate("Dölj vinster", "Show less")
                          : translate("Visa fler vinster", "Show more")}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {activeTab === "perGame" && (
        <Box sx={{ mt: 3 }}>
          {gameOptions.length === 0 ? (
            <Typography sx={{ color: "#e2e8f0" }}>
              {isLoading
                ? translate("Laddar vinster per spel ...", "Loading wins per game...")
                : translate("Inga vinster per spel att visa ännu.", "No wins per game to display yet.")}
            </Typography>
          ) : (
            <>
              <Typography sx={{ color: "#e2e8f0", textAlign: "center", mb: 2 }}>
                {translate(
                  "Välj spel för att se största vinsterna",
                  "Pick a game to explore its biggest wins"
                )}
              </Typography>
              {isSmallScreen ? (
                <FormControl
                  fullWidth
                  sx={{
                    maxWidth: 420,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <InputLabel
                    id="per-game-select-label"
                    sx={{
                      color: "#cbd5f5",
                      "&.Mui-focused": { color: "#38bdf8" },
                    }}
                  >
                    {perGameSelectorLabel}
                  </InputLabel>
                  <Select
                    labelId="per-game-select-label"
                    label={perGameSelectorLabel}
                    value={selectedGame ?? ""}
                    onChange={(event) => setSelectedGame(event.target.value)}
                    sx={{
                      borderRadius: 2,
                      color: "#e2e8f0",
                      "& .MuiSvgIcon-root": { color: "#e2e8f0" },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: "#0f172a",
                          color: "#f8fafc",
                        },
                      },
                    }}
                  >
                    {gameOptions.map((game) => (
                      <MenuItem value={game.gameShow} key={game.gameShow}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: game.color,
                              border: "1px solid rgba(15,23,42,0.4)",
                            }}
                          />
                          <Box component="span">{`${game.displayName} (${game.winsCount})`}</Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box
                  sx={{
                    overflowX: "auto",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ minWidth: "fit-content" }}>
                    {gameOptions.map((game) => {
                      const isActive = game.gameShow === selectedGame;
                      return (
                        <Button
                          key={game.gameShow}
                          onClick={() => setSelectedGame(game.gameShow)}
                          variant={isActive ? "contained" : "outlined"}
                          size="small"
                          startIcon={
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: game.color,
                                border: "1px solid rgba(15,23,42,0.4)",
                              }}
                            />
                          }
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 999,
                            borderColor: "rgba(148,163,184,0.35)",
                            color: isActive ? "#0f172a" : "#e2e8f0",
                            backgroundColor: isActive ? "#38bdf8" : "transparent",
                            "&:hover": {
                              borderColor: "rgba(148,163,184,0.7)",
                            },
                          }}
                        >
                          {`${game.displayName} (${game.winsCount})`}
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {selectedGame && entriesByGame.has(selectedGame) ? (
                <Grid
                  container
                  spacing={2}
                  sx={{
                    justifyContent: "center",
                  }}
                >
                  {entriesByGame.get(selectedGame).map((entry, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={`${selectedGame}-${entry.id}-${idx}`}>
                      <EntryCard
                        entry={entry}
                        rank={idx}
                        numberLocale={numberLocale}
                        locale={locale}
                        translate={translate}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography sx={{ color: "#e2e8f0", textAlign: "center" }}>
                  {translate("Inga vinster från det här spelet ännu.", "No wins from this game yet.")}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {activeTab === "chart" && (
        <Box sx={{ width: "100%", mt: 3 }}>
          <LiveTop3PayoutChart
            dayOptions={chartDayOptions}
            locale={locale}
            translate={translate}
            isLoading={isLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default LiveTop3;
